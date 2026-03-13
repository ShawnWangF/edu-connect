CREATE TABLE `batchExchangeSchools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`schoolId` int NOT NULL,
	`plannedDate` date,
	`confirmedDate` date,
	`status` enum('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `batchExchangeSchools_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `batchStaff` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`staffId` int NOT NULL,
	`role` enum('coordinator','staff','guide','driver') NOT NULL,
	`startDate` date,
	`endDate` date,
	`currentTask` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `batchStaff_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exchangeSchoolAvailability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`date` date NOT NULL,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`availableTimeStart` varchar(10),
	`availableTimeEnd` varchar(10),
	`maxGroups` int DEFAULT 1,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exchangeSchoolAvailability_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduleBlocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`date` date NOT NULL,
	`blockType` enum('sz_arrive','sz_stay','hk_arrive','hk_stay','exchange','border_sz_hk','border_hk_sz','departure','free') NOT NULL DEFAULT 'free',
	`isExchangeDay` boolean NOT NULL DEFAULT false,
	`exchangeSchoolId` int,
	`flightNumber` varchar(50),
	`flightTime` varchar(10),
	`busInfo` text,
	`hotelCity` enum('sz','hk','macau','other'),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduleBlocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schoolExchanges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`schoolId` int NOT NULL,
	`exchangeDate` date NOT NULL,
	`startTime` varchar(10),
	`endTime` varchar(10),
	`activities` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schoolExchanges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`role` enum('coordinator','staff','guide','driver') NOT NULL,
	`phone` varchar(50),
	`email` varchar(100),
	`wechat` varchar(100),
	`languages` text,
	`licenseNumber` varchar(50),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attractions` ADD `openingHours` json;--> statement-breakpoint
ALTER TABLE `attractions` ADD `closedDays` json;--> statement-breakpoint
ALTER TABLE `attractions` ADD `requiresBooking` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `attractions` ADD `bookingLeadTime` int;--> statement-breakpoint
ALTER TABLE `attractions` ADD `contactPerson` varchar(100);--> statement-breakpoint
ALTER TABLE `attractions` ADD `contactPhone` varchar(50);--> statement-breakpoint
ALTER TABLE `restaurants` ADD `businessHours` varchar(200);--> statement-breakpoint
ALTER TABLE `restaurants` ADD `specialties` text;--> statement-breakpoint
ALTER TABLE `schools` ADD `schoolType` varchar(50);--> statement-breakpoint
ALTER TABLE `schools` ADD `maxGroupSize` int DEFAULT 50;--> statement-breakpoint
ALTER TABLE `templates` ADD `applicableTypes` json;--> statement-breakpoint
ALTER TABLE `templates` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `templates` DROP COLUMN `type`;--> statement-breakpoint
ALTER TABLE `templates` DROP COLUMN `content`;