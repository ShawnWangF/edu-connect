ALTER TABLE `attractions` ADD `location` text;--> statement-breakpoint
ALTER TABLE `attractions` ADD `capacity` int;--> statement-breakpoint
ALTER TABLE `attractions` ADD `unavailableTimeSlots` json;--> statement-breakpoint
ALTER TABLE `attractions` ADD `isAlwaysUnavailable` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `attractions` DROP COLUMN `availableTimeSlots`;--> statement-breakpoint
ALTER TABLE `attractions` DROP COLUMN `isAllDayAvailable`;