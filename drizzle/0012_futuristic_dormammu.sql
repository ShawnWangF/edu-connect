ALTER TABLE `groups` ADD `batchCode` varchar(32);--> statement-breakpoint
ALTER TABLE `groups` ADD `startCity` enum('sz','hk','macau');--> statement-breakpoint
ALTER TABLE `groups` ADD `flightInfo` json;--> statement-breakpoint
ALTER TABLE `groups` ADD `schoolList` json;