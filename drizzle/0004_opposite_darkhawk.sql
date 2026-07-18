CREATE TABLE `budget_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`month_id` text NOT NULL,
	`category_id` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`amount` real NOT NULL,
	`note` text NOT NULL,
	FOREIGN KEY (`month_id`) REFERENCES `budget_months`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `budget_movements_month_id_idx` ON `budget_movements` (`month_id`);
--> statement-breakpoint
INSERT INTO `budget_movements` (`id`, `month_id`, `category_id`, `occurred_at`, `amount`, `note`)
SELECT
	'migrated-' || `budget_month_categories`.`month_id` || '-' || `budget_month_categories`.`category_id`,
	`budget_month_categories`.`month_id`,
	`budget_month_categories`.`category_id`,
	`budget_months`.`date`,
	`budget_month_categories`.`actual_amount`,
	'Saldo inicial (migrado desde el actual anterior)'
FROM `budget_month_categories`
JOIN `budget_months` ON `budget_months`.`id` = `budget_month_categories`.`month_id`
WHERE `budget_month_categories`.`actual_amount` IS NOT NULL AND `budget_month_categories`.`actual_amount` != 0;