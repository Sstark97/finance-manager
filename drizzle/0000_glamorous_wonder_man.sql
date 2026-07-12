CREATE TABLE `account` (
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `provider_account_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `budget_base` (
	`user_id` text PRIMARY KEY NOT NULL,
	`ingreso_neto` real NOT NULL,
	`gastos_fijos` real NOT NULL,
	`inversion` real NOT NULL,
	`fondo_emergencia` real NOT NULL,
	`ocio` real NOT NULL,
	`caprichos` real NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `budget_events` (
	`id` text PRIMARY KEY NOT NULL,
	`month_id` text NOT NULL,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`category` text NOT NULL,
	FOREIGN KEY (`month_id`) REFERENCES `budget_months`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `budget_month_categories` (
	`month_id` text NOT NULL,
	`category_id` text NOT NULL,
	`override_amount` real,
	`actual_amount` real,
	PRIMARY KEY(`month_id`, `category_id`),
	FOREIGN KEY (`month_id`) REFERENCES `budget_months`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `budget_months` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` integer NOT NULL,
	`label` text NOT NULL,
	`net_income_override` real,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `budget_months_user_id_idx` ON `budget_months` (`user_id`);--> statement-breakpoint
CREATE TABLE `debts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`installment` real NOT NULL,
	`balance` real NOT NULL,
	`note` text NOT NULL,
	`deadline` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `debts_user_id_idx` ON `debts` (`user_id`);--> statement-breakpoint
CREATE TABLE `fixed_expense_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fixed_expense_items_user_id_idx` ON `fixed_expense_items` (`user_id`);--> statement-breakpoint
CREATE TABLE `goals_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`current_salary` real NOT NULL,
	`fi_contribution` real NOT NULL,
	`fi_return` real NOT NULL,
	`btc_savings` real NOT NULL,
	`btc_disposable` integer NOT NULL,
	`btc_dca_active` integer NOT NULL,
	`count_car` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `position_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`position_id` text NOT NULL,
	`kind` text NOT NULL,
	`executed_at` integer NOT NULL,
	`units` real NOT NULL,
	`price` real NOT NULL,
	`fee` real,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`ticker` text NOT NULL,
	`type` text NOT NULL,
	`units` real NOT NULL,
	`group_name` text NOT NULL,
	`last_price` real,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `positions_user_id_idx` ON `positions` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`email_verified` integer,
	`image` text,
	`password_hash` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);