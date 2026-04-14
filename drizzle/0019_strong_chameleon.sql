ALTER TABLE `locations` ADD `maxCapacity` int;--> statement-breakpoint
ALTER TABLE `locations` ADD `closedDays` json;--> statement-breakpoint
ALTER TABLE `locations` ADD `openingHours` varchar(100);