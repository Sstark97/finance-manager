CREATE TABLE `wealth_targets` (
	`user_id` text PRIMARY KEY NOT NULL,
	`emergency_fund` real NOT NULL,
	`minimum_fund` real NOT NULL,
	`equity_target_world` real NOT NULL,
	`equity_target_em` real NOT NULL,
	`equity_target_nasdaq` real NOT NULL,
	`btc_pause_weight` real NOT NULL,
	`btc_sell_weight` real NOT NULL,
	`btc_pause_capital` real NOT NULL,
	`btc_sell_capital` real NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
