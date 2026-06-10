ALTER TABLE `staff` MODIFY `role` enum('coordinator','staff','guide','driver','security','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `customRole` varchar(100);--> statement-breakpoint
ALTER TABLE `staff` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `staff` ADD `locationSharingEnabled` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `staff` ADD `lastLatitude` varchar(32);--> statement-breakpoint
ALTER TABLE `staff` ADD `lastLongitude` varchar(32);--> statement-breakpoint
ALTER TABLE `staff` ADD `lastLocationAccuracy` int;--> statement-breakpoint
ALTER TABLE `staff` ADD `lastLocationAt` timestamp NULL;--> statement-breakpoint
ALTER TABLE `batchStaff` MODIFY `role` enum('coordinator','staff','guide','driver','security','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `batchStaff` ADD `customRole` varchar(100);
