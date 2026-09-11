CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_activities_shop_time` ON `activities` (`shop_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`revision` integer NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_plans_shop` ON `plans` (`shop_id`);--> statement-breakpoint
CREATE TABLE `reorders` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`lines` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reorders_shop_time` ON `reorders` (`shop_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `shops` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock` (
	`shop_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	PRIMARY KEY(`shop_id`, `product_id`)
);
