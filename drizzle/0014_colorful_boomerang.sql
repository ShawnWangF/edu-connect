ALTER TABLE `batchStaff` ADD `date` date;--> statement-breakpoint
ALTER TABLE `batchStaff` ADD `itineraryId` int;--> statement-breakpoint
ALTER TABLE `batchStaff` ADD `taskName` varchar(255);--> statement-breakpoint
ALTER TABLE `batchStaff` ADD `startTime` varchar(10);--> statement-breakpoint
ALTER TABLE `batchStaff` ADD `endTime` varchar(10);--> statement-breakpoint
ALTER TABLE `batchStaff` DROP COLUMN `startDate`;--> statement-breakpoint
ALTER TABLE `batchStaff` DROP COLUMN `endDate`;--> statement-breakpoint
ALTER TABLE `batchStaff` DROP COLUMN `currentTask`;