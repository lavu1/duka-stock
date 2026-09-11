"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  AudioLines,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  Download,
  History,
  LoaderCircle,
  Mic,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Volume2,
  X,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster, toast } from "sonner";
import {
  money,
  stockStatus,
  type Product,
  type Plan,
  type Snapshot,
  type Reorder,
} from "@/lib/stock";

type Answer = {
  kind: "plan" | "answer";
  message: string;
  plan?: Plan;
  products?: Product[];
};
type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechResult) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type VoiceWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
const subscribeVoice = () => () => {};
const getVoiceSupport = () =>
  Boolean(
    (window as VoiceWindow).SpeechRecognition ||
    (window as VoiceWindow).webkitSpeechRecognition,
  );
const getServerVoiceSupport = () => false;
const examples = [
  {
    text: "Sold 3 milk and 2 bread",
    label: "Record a sale",
    icon: ArrowUpRight,
  },
  {
    text: "Received 12 bread",
    label: "Receive a delivery",
    icon: ArrowDownLeft,
  },
  { text: "What is running low?", label: "Check low stock", icon: Package },
];
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}
let rpcId = 0;
let mcpReady: Promise<void> | null = null;
function initializeMcp() {
  if (!mcpReady)
    mcpReady = (async () => {
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "MCP-Protocol-Version": "2025-11-25",
      };
      const initial = await fetch("/api/mcp", {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: ++rpcId,
          method: "initialize",
          params: {
            protocolVersion: "2025-11-25",
            capabilities: {},
            clientInfo: { name: "duka-alexa-simulation", version: "1.0.0" },
          },
        }),
      });
      if (!initial.ok)
        throw new Error(
          "The shop assistant couldn't connect. Please try again.",
        );
      const notification = await fetch("/api/mcp", {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
      });
      if (notification.status !== 202)
        throw new Error("The shop assistant couldn't finish connecting.");
    })().catch((e) => {
      mcpReady = null;
      throw e;
    });
  return mcpReady;
}
async function callTool<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const data = await request<{
    error?: { message: string };
    result: {
      isError?: boolean;
      content: { type: string; text: string }[];
      structuredContent: T;
    };
  }>("/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-11-25",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: ++rpcId,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  if (data.error) throw new Error(data.error.message);
  if (data.result.isError) throw new Error(data.result.content[0].text);
  return data.result.structuredContent;
}
function dateTime(value: number) {
  return new Intl.DateTimeFormat("en-ZM", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lusaka",
  }).format(value);
}
function CategoryIcon({ category }: { category: string }) {
  return (
    <span className={`product-icon category-${category.toLowerCase()}`}>
      <Package size={20} />
    </span>
  );
}

export default function Shop() {
  const [state, setState] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState("stock");
  const [filter, setFilter] = useState("all");
  const [command, setCommand] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState("");
  const [lastCommand, setLastCommand] = useState("");
  const [listening, setListening] = useState(false);
  const voiceAvailable = useSyncExternalStore(
    subscribeVoice,
    getVoiceSupport,
    getServerVoiceSupport,
  );
  const [voiceHelp, setVoiceHelp] = useState(false);
  const [help, setHelp] = useState(false);
  const [adjust, setAdjust] = useState<Product | null>(null);
  const [adjustMode, setAdjustMode] = useState("sell");
  const [amount, setAmount] = useState("1");
  const [trace, setTrace] = useState<{ tool: string; ms: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const assistant = useRef<HTMLElement>(null);
  const recognition = useRef<Recognition | null>(null);
  const busyRef = useRef(false);
  const load = useCallback(async () => {
    try {
      setState(await request<Snapshot>("/api/stock"));
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    let active = true;
    void request<Snapshot>("/api/stock").then(
      (data) => {
        if (active) {
          setState(data);
          setLoadError("");
        }
      },
      (e) => {
        if (active) setLoadError((e as Error).message);
      },
    );
    return () => {
      active = false;
      recognition.current?.abort();
    };
  }, []);
  async function ask(text = command, tool = "preview_stock_change") {
    if (busyRef.current || (!text.trim() && tool !== "prepare_reorder")) return;
    if (answer?.plan) {
      toast.info("Confirm or cancel your current review first.");
      assistant.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    setLastCommand(text);
    setAnswer(null);
    const started = performance.now();
    try {
      await initializeMcp();
      const result = await callTool<Answer>(
        tool,
        tool === "prepare_reorder" ? {} : { command: text },
      );
      setAnswer(result);
      setTrace({ tool, ms: Math.round(performance.now() - started) });
      setCommand("");
    } catch (e) {
      setError((e as Error).message);
      setCommand(text);
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }
  async function review(action: "confirm" | "cancel") {
    if (!answer?.plan || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await request<{ message: string; state: Snapshot }>(
        "/api/review",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Duka-Review": "1" },
          body: JSON.stringify({ id: answer.plan.id, action }),
        },
      );
      setState(result.state);
      setAnswer({ kind: "answer", message: result.message });
      toast.success(result.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }
  function startVoice() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    if (!voiceAvailable) {
      setVoiceHelp(true);
      return;
    }
    const Constructor =
      (window as VoiceWindow).SpeechRecognition ||
      (window as VoiceWindow).webkitSpeechRecognition;
    if (!Constructor) return;
    const r = new Constructor();
    r.lang = "en-ZA";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e) => {
      setCommand(e.results[0][0].transcript);
      setVoiceHelp(false);
      input.current?.focus();
    };
    r.onerror = (e) => {
      setError(
        e.error === "not-allowed"
          ? "Microphone permission was declined. You can type your update below."
          : e.error === "no-speech"
            ? "I didn't hear a complete update. Try again, or type it below."
            : "Voice input is unavailable right now. Type your update below.",
      );
      setListening(false);
    };
    r.onend = () => setListening(false);
    recognition.current = r;
    setError("");
    try {
      r.start();
      setListening(true);
    } catch {
      setError("Voice input couldn't start. You can type your update below.");
    }
  }
  function speak() {
    if (answer && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(
        new SpeechSynthesisUtterance(answer.message),
      );
    }
  }
  function prepareReorder() {
    setLastCommand("Prepare a reorder draft");
    assistant.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    void ask("Prepare a reorder draft", "prepare_reorder");
  }
  function manual(e: FormEvent) {
    e.preventDefault();
    if (!adjust) return;
    const verb =
      adjustMode === "sell"
        ? "Sold"
        : adjustMode === "receive"
          ? "Received"
          : "Set";
    const text =
      adjustMode === "set"
        ? `${verb} ${adjust.name} to ${amount}`
        : `${verb} ${amount} ${adjust.name}`;
    setAdjust(null);
    void ask(text);
    assistant.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  const products = state?.products ?? [];
  const low = products.filter((p) => p.quantity <= p.minimum);
  const shown = filter === "low" ? low : products;
  const pending = Boolean(answer?.plan);
  return (
    <div className="duka-app">
      <Toaster richColors position="bottom-center" />
      <a className="skip-link" href="#stock-workspace">
        Skip to stock
      </a>
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Duka home">
          <span className="brand-mark">
            <AudioLines size={25} />
          </span>
          <strong>
            duka<span>.</span>
          </strong>
          <span className="brand-tag">STOCK, SPOKEN.</span>
        </Link>
        <div className="topbar-right">
          <span className="demo-badge">Sample shop</span>
          <Button
            variant="ghost"
            onClick={() => setHelp(true)}
            className="help-button"
          >
            <BookOpen size={17} />
            <span>Demo guide</span>
          </Button>
          <span className="avatar" aria-label="Sample shop">
            MS
          </span>
        </div>
      </header>
      <div className="workspace">
        <section className="page-intro">
          <div>
            <p className="eyebrow">
              <Store size={15} /> MANDA’S CORNER · LUSAKA
            </p>
            <h1>
              A little less admin.
              <br className="mobile-break" /> A lot more shop.
            </h1>
            <p className="intro-note">
              Keep your stock in order, one conversation at a time.
            </p>
          </div>
          <div className="workspace-note">
            <ShieldCheck size={18} />
            <span>
              Every change gets
              <br />
              <strong>your final say.</strong>
            </span>
          </div>
        </section>
        <div className="main-grid">
          <main id="stock-workspace" className="stock-workspace">
            {loadError && (
              <div className="error-banner" role="alert">
                <AlertCircle size={18} />
                <span>{loadError}</span>
                <Button variant="outline" size="sm" onClick={load}>
                  Try again
                </Button>
              </div>
            )}
            <section className="metrics" aria-label="Stock summary">
              <div className="metric">
                <span className="metric-label">
                  <Package size={17} /> Products on the shelf
                </span>
                <strong>
                  {state ? products.length : "—"}
                  <small>products</small>
                </strong>
                <span className="metric-foot">
                  {state ? products.reduce((n, p) => n + p.quantity, 0) : "—"}{" "}
                  individual units
                </span>
              </div>
              <button
                className={`metric low-metric ${filter === "low" ? "selected" : ""}`}
                onClick={() => {
                  setFilter(filter === "low" ? "all" : "low");
                  setTab("stock");
                }}
              >
                <span className="metric-label">
                  <AlertCircle size={17} /> Time to restock
                </span>
                <strong>
                  {state ? low.length : "—"}
                  <small>products</small>
                </strong>
                <span className="metric-foot">
                  Review low stock <ArrowRight size={15} />
                </span>
              </button>
              <div className="metric">
                <span className="metric-label">
                  <ReceiptText size={17} /> Stock value at cost
                </span>
                <strong className="money-metric">
                  {state
                    ? money(
                        products.reduce((n, p) => n + p.quantity * p.cost, 0),
                      )
                    : "—"}
                </strong>
                <span className="metric-foot">
                  Based on sample purchase prices
                </span>
              </div>
            </section>
            <Tabs value={tab} onValueChange={setTab} className="stock-tabs">
              <div className="stock-nav">
                <TabsList variant="line" aria-label="Shop views">
                  <TabsTrigger value="stock">
                    <Package /> Stock
                  </TabsTrigger>
                  <TabsTrigger value="reorders">
                    <ShoppingBasket /> Reorders{" "}
                    {state && state.reorders.length > 0 && (
                      <span className="count">{state.reorders.length}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="activity">
                    <History /> Activity
                  </TabsTrigger>
                </TabsList>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Refresh stock"
                  onClick={load}
                >
                  <RefreshCw size={16} />
                </Button>
              </div>
              <TabsContent value="stock">
                <section className="inventory-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        {filter === "low"
                          ? "Ready for a refill"
                          : "On your shelves"}
                      </h2>
                      <p>
                        {filter === "low"
                          ? "At or below your restock levels."
                          : "Your everyday essentials, all accounted for."}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={prepareReorder}
                      disabled={!state || busy || pending || !low.length}
                    >
                      <Plus size={16} /> Reorder draft
                    </Button>
                  </div>
                  {filter === "low" && (
                    <div className="filter-strip">
                      <span>Showing {low.length} low-stock products</span>
                      <button onClick={() => setFilter("all")}>
                        Show all <X size={14} />
                      </button>
                    </div>
                  )}
                  {!state ? (
                    <div className="loading-stock" role="status">
                      <LoaderCircle className="spin" /> Loading your shop…
                    </div>
                  ) : (
                    <Table className="inventory-table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>On hand</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="price-col">
                            Unit price
                          </TableHead>
                          <TableHead>
                            <span className="sr-only">Update stock</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shown.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>
                              <div className="product-cell">
                                <CategoryIcon category={p.category} />
                                <div>
                                  <strong>{p.name}</strong>
                                  <span>
                                    {p.pack} <i>·</i> {p.category}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="quantity">{p.quantity}</span>
                              <span className="quantity-unit">units</span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`stock-status ${p.quantity <= p.minimum ? "low" : "okay"}`}
                              >
                                {stockStatus(p)}
                              </span>
                            </TableCell>
                            <TableCell className="price-col">
                              {money(p.price)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Update ${p.name}`}
                                disabled={busy || pending}
                                onClick={() => {
                                  setAdjust(p);
                                  setAmount("1");
                                  setAdjustMode("sell");
                                }}
                              >
                                <Plus size={18} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {state && shown.length === 0 && (
                    <div className="empty-state">
                      <CheckCheck />
                      <h3>Your shelves are in good shape.</h3>
                      <p>No products need restocking right now.</p>
                    </div>
                  )}
                  <div className="table-foot">
                    <span>
                      {shown.length} products · Prices in Zambian kwacha
                    </span>
                    <span>Sample inventory · changes are saved</span>
                  </div>
                </section>
              </TabsContent>
              <TabsContent value="reorders">
                <section className="inventory-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Reorder drafts</h2>
                      <p>
                        Ready to review with your supplier. Never sent
                        automatically.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={prepareReorder}
                      disabled={!state || busy || pending || !low.length}
                    >
                      <Plus size={16} /> New draft
                    </Button>
                  </div>
                  {!state?.reorders.length ? (
                    <div className="empty-state">
                      <ShoppingBasket />
                      <h3>Give tomorrow’s shelves a head start.</h3>
                      <p>
                        Ask Duka to prepare a reorder from your low-stock
                        products.
                      </p>
                      <Button
                        onClick={prepareReorder}
                        disabled={!state || busy || pending || !low.length}
                      >
                        Prepare a draft <ArrowRight size={16} />
                      </Button>
                    </div>
                  ) : (
                    <div className="drafts">
                      {state.reorders.map((r) => (
                        <Draft key={r.id} draft={r} />
                      ))}
                    </div>
                  )}
                </section>
              </TabsContent>
              <TabsContent value="activity">
                <section className="inventory-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>The shop’s paper trail</h2>
                      <p>
                        Only confirmed updates appear here. Times shown for
                        Zambia.
                      </p>
                    </div>
                    <History size={20} />
                  </div>
                  {!state?.activity.length ? (
                    <div className="empty-state">
                      <History />
                      <h3>A fresh page for your shop.</h3>
                      <p>
                        Record a sale or receive a delivery to start your change
                        history.
                      </p>
                    </div>
                  ) : (
                    <ol className="activity-list">
                      {state.activity.map((a) => (
                        <li key={a.id}>
                          <span className="activity-icon">
                            {a.kind === "reorder" ? (
                              <ShoppingBasket size={18} />
                            ) : (
                              <Check size={18} />
                            )}
                          </span>
                          <div>
                            <h3>{a.title}</h3>
                            <p>{a.detail}</p>
                            <time
                              dateTime={new Date(a.createdAt).toISOString()}
                            >
                              {dateTime(a.createdAt)}
                            </time>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </TabsContent>
            </Tabs>
            <div className="bottom-note">
              <AudioLines size={17} />
              <span>Small words. Up-to-date shelves.</span>
              <button onClick={() => setHelp(true)}>
                How this demo works <ChevronRight size={14} />
              </button>
            </div>
          </main>
          <aside
            className="assistant"
            ref={assistant}
            aria-label="Duka stock assistant"
          >
            <div className="assistant-top">
              <div className="assistant-label">
                <AudioLines size={18} />
                <span>YOUR SHOP ASSISTANT</span>
              </div>
              <span className="simulation-label">Alexa+ simulation</span>
            </div>
            <div className="assistant-welcome">
              <div className="voice-orbit">
                <button
                  className={`mic-button ${listening ? "listening" : ""}`}
                  onClick={startVoice}
                  disabled={busy || pending || !state}
                  aria-label={
                    listening ? "Stop listening" : "Start voice input"
                  }
                >
                  {listening ? <AudioLines size={33} /> : <Mic size={29} />}
                </button>
              </div>
              <h2>{listening ? "I’m listening." : "Just say what changed."}</h2>
              <p>
                {listening
                  ? "Speak one stock update, then wait for the transcript."
                  : "Speak or type. Review the details. Back to your customers."}
              </p>
            </div>
            <div className="assistant-body">
              {voiceHelp && (
                <div className="helper-note">
                  Your browser does not support voice input. Type an update
                  below; it follows the same review process.
                </div>
              )}
              {!answer && !error && !busy && (
                <div className="starter-prompts">
                  <p className="small-label">TRY A SHOP MOMENT</p>
                  {examples.map((x) => (
                    <button
                      key={x.text}
                      onClick={() => ask(x.text)}
                      disabled={!state}
                    >
                      <x.icon size={17} />
                      <span>
                        <small>{x.label}</small>
                        <strong>“{x.text}”</strong>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
              )}
              {(lastCommand || busy) && (
                <div className="user-bubble">
                  <span>YOU</span>
                  <p>{lastCommand}</p>
                </div>
              )}
              {busy && !pending && (
                <div className="thinking" role="status">
                  <LoaderCircle className="spin" size={17} /> Checking your
                  shelves…
                </div>
              )}
              {error && (
                <div className="assistant-error" role="alert">
                  <AlertCircle size={18} />
                  <p>{error}</p>
                </div>
              )}
              {answer && (
                <div className="answer" aria-live="polite">
                  <div className="answer-title">
                    <span className="tiny-mark">
                      <AudioLines size={15} />
                    </span>
                    <strong>DUKA</strong>
                    <button
                      onClick={speak}
                      aria-label="Read Duka’s response aloud"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                  <p>{answer.message}</p>
                  {answer.products && answer.products.length > 0 && (
                    <ul className="answer-products">
                      {answer.products.map((p) => (
                        <li key={p.id}>
                          <span>{p.name}</span>
                          <strong>{p.quantity} left</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                  {answer.plan && (
                    <div className="review-card">
                      <div className="review-heading">
                        <ShieldCheck size={16} />
                        <strong>YOUR REVIEW</strong>
                        <span>Not saved yet</span>
                      </div>
                      {answer.plan.kind === "adjust" ? (
                        <div className="review-changes">
                          {answer.plan.changes.map((c) => (
                            <div key={c.productId}>
                              <span>{c.name}</span>
                              <strong>
                                {c.before}
                                <ArrowRight size={14} />
                                {c.after}
                                <small
                                  className={
                                    c.delta < 0 ? "negative" : "positive"
                                  }
                                >
                                  {c.delta > 0 ? "+" : ""}
                                  {c.delta}
                                </small>
                              </strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="review-changes">
                            {answer.plan.lines.map((l) => (
                              <div key={l.productId}>
                                <span>
                                  {l.name}
                                  <small>{l.supplier}</small>
                                </span>
                                <strong>
                                  {l.quantity}
                                  <small>units</small>
                                </strong>
                              </div>
                            ))}
                          </div>
                          <div className="review-total">
                            <span>Estimated cost</span>
                            <strong>
                              {money(
                                answer.plan.lines.reduce(
                                  (n, l) => n + l.quantity * l.cost,
                                  0,
                                ),
                              )}
                            </strong>
                          </div>
                        </>
                      )}
                      <div className="review-actions">
                        <Button
                          onClick={() => review("confirm")}
                          disabled={busy}
                        >
                          {busy ? (
                            <LoaderCircle className="spin" size={16} />
                          ) : (
                            <Check size={16} />
                          )}{" "}
                          {answer.plan.kind === "adjust"
                            ? "Confirm update"
                            : "Save draft"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => review("cancel")}
                          disabled={busy}
                        >
                          Cancel
                        </Button>
                      </div>
                      <p className="review-expiry">
                        Review expires in 10 minutes.
                      </p>
                    </div>
                  )}
                  {!answer.plan && (
                    <button
                      className="new-conversation"
                      onClick={() => {
                        setAnswer(null);
                        setLastCommand("");
                        setTrace(null);
                        input.current?.focus();
                      }}
                    >
                      Another shop moment <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              )}
              {trace && (
                <details className="tool-trace">
                  <summary>
                    <CheckCheck size={13} /> View tool call
                  </summary>
                  <code>{trace.tool}</code>
                  <p>Streamable HTTP · {trace.ms} ms · real stock service</p>
                </details>
              )}
            </div>
            <form
              className="command-form"
              onSubmit={(e) => {
                e.preventDefault();
                void ask();
              }}
            >
              <label className="sr-only" htmlFor="shop-command">
                Your stock update
              </label>
              <Input
                id="shop-command"
                ref={input}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                maxLength={500}
                placeholder="e.g. “Sold 3 milk”"
                disabled={busy || pending || !state}
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Review stock update"
                disabled={busy || pending || !state || !command.trim()}
              >
                <Send size={17} />
              </Button>
            </form>
            <p className="voice-note">
              Voice uses your browser’s speech service.
              <br />
              Always check the transcript before sending.
            </p>
          </aside>
        </div>
        <footer className="page-footer">
          <span>
            <strong>duka.</strong> Made for the people behind the counter.
          </span>
          <span>Working prototype · Sample data · English voice & text</span>
        </footer>
      </div>
      <Dialog
        open={!!adjust}
        onOpenChange={(open) => {
          if (!open) setAdjust(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update {adjust?.name}</DialogTitle>
            <DialogDescription>
              {adjust?.quantity} units on hand. You’ll review the change before
              it is saved.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={manual} className="adjust-form">
            <label htmlFor="adjust-mode">What changed?</label>
            <Select value={adjustMode} onValueChange={setAdjustMode}>
              <SelectTrigger id="adjust-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sell">Record a sale</SelectItem>
                <SelectItem value="receive">Receive a delivery</SelectItem>
                <SelectItem value="set">Correct the stock count</SelectItem>
              </SelectContent>
            </Select>
            <label htmlFor="adjust-amount">
              {adjustMode === "set" ? "New total quantity" : "Number of units"}
            </label>
            <Input
              id="adjust-amount"
              type="number"
              min={adjustMode === "set" ? 0 : 1}
              max={10000}
              step={1}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button type="submit">
              Review change <ArrowRight size={16} />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="guide-dialog">
          <DialogHeader>
            <DialogTitle>Meet your shop’s second pair of hands.</DialogTitle>
            <DialogDescription>
              Duka is a working Alexa+ experience simulation, built for the
              Amazon Developer Hackathon.
            </DialogDescription>
          </DialogHeader>
          <div className="guide-content">
            <ol>
              <li>
                <strong>Record a sale.</strong> Try “Sold 3 milk and 2 bread”.
                Check the quantities, then confirm.
              </li>
              <li>
                <strong>Receive a delivery.</strong> Say “Received 12 bread”. Or
                use the + beside a product.
              </li>
              <li>
                <strong>Plan your next order.</strong> Ask “What is running
                low?”, then prepare and save a reorder draft.
              </li>
              <li>
                <strong>Follow the change.</strong> Open Activity. Your
                confirmed changes survive refreshes.
              </li>
            </ol>
            <div className="helper-note">
              <strong>What’s real?</strong> The stock database, MCP tool calls,
              review checks, history, and CSV drafts work. This demo uses a
              limited command grammar and ten sample products; it is not
              connected to an Echo device, an Amazon account, or a supplier.
            </div>
            <p>
              Voice transcription depends on browser support and microphone
              access. This demo supports English and whole product units. Typed
              commands always work.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Draft({ draft }: { draft: Reorder }) {
  const total = draft.lines.reduce((n, l) => n + l.quantity * l.cost, 0);
  return (
    <article className="draft">
      <div className="draft-header">
        <div>
          <span className="draft-label">DRAFT · NOT SENT</span>
          <h3>{dateTime(draft.createdAt)}</h3>
        </div>
        <a
          href={`/api/reorders/${encodeURIComponent(draft.id)}`}
          className="download-link"
        >
          <Download size={16} /> Download CSV
        </a>
      </div>
      <ul>
        {draft.lines.map((l) => (
          <li key={l.productId}>
            <div>
              <strong>{l.name}</strong>
              <span>{l.supplier}</span>
            </div>
            <span>{l.quantity} units</span>
            <strong>{money(l.quantity * l.cost)}</strong>
          </li>
        ))}
      </ul>
      <div className="draft-total">
        <span>Estimated purchase cost</span>
        <strong>{money(total)}</strong>
      </div>
    </article>
  );
}
