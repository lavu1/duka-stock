import { spawn } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

// A fresh, disposable database lets contributors verify isolation without touching a shop.
const state = await mkdtemp(path.join(tmpdir(), "duka-integration-"));
const wrangler = [
  "--import",
  "./scripts/sites-env.mjs",
  "./node_modules/wrangler/bin/wrangler.js",
];
const config = [
  "--config",
  "dist/server/wrangler.json",
  "--local",
  "--persist-to",
  state,
];
function run(args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Verification command exited with ${code}`)),
    );
  });
}
let worker;
let workerOutput = "";
try {
  for (const migration of (await readdir("drizzle"))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    await run([
      ...wrangler,
      "d1",
      "execute",
      "DB",
      ...config,
      "--file",
      path.join("drizzle", migration),
    ]);
  }
  const lease = createServer();
  await new Promise((resolve, reject) => {
    lease.once("error", reject);
    lease.listen(0, "127.0.0.1", resolve);
  });
  const port = lease.address().port;
  await new Promise((resolve) => lease.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  worker = spawn(
    process.execPath,
    [
      ...wrangler,
      "dev",
      ...config,
      "--ip",
      "127.0.0.1",
      "--port",
      String(port),
      "--inspector-port",
      "0",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let startupError;
  worker.once("error", (error) => {
    startupError = error;
  });
  const collect = (data) => {
    workerOutput = (workerOutput + data).slice(-12000);
  };
  worker.stdout.on("data", collect);
  worker.stderr.on("data", collect);
  let ready = false;
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (startupError) throw startupError;
    if (worker.exitCode !== null)
      throw new Error("Local test Worker stopped before it was ready.");
    try {
      const response = await fetch(`${base}/api/stock`, {
        signal: AbortSignal.timeout(2000),
      });
      const data = await response.json();
      if (response.ok && data.products?.length === 10) {
        ready = true;
        break;
      }
    } catch {
      /* Worker is starting; retry only within the bounded readiness window. */
    }
    await delay(300);
  }
  if (!ready)
    throw new Error("Local test Worker did not become ready in 60 seconds.");
  await run(["tests/integration.mjs"], { ...process.env, DUKA_TEST_URL: base });
} catch (error) {
  console.error(workerOutput);
  throw error;
} finally {
  if (worker && worker.exitCode === null) {
    const exited = new Promise((resolve) => worker.once("exit", resolve));
    worker.kill("SIGTERM");
    await Promise.race([exited, delay(3000)]);
    if (worker.exitCode === null) {
      worker.kill("SIGKILL");
      await exited;
    }
  }
  await rm(state, { recursive: true, force: true });
}
