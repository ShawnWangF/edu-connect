CREATE TABLE `batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255),
	`arrivalDate` date,
	`departureDate` date,
	`arrivalFlight` varchar(100),
	`departureFlight` varchar(100),
	`arrivalTime` varchar(10),
	`departureTime` varchar(10),
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `domesticSchools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`studentCount` int DEFAULT 0,
	`teacherCount` int DEFAULT 0,
	`contactPerson` varchar(100),
	`contactPhone` varchar(50),
	`contactEmail` varchar(100),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `domesticSchools_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exchangeSchools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`region` varchar(50),
	`contactPerson` varchar(100),
	`contactPhone` varchar(50),
	`contactEmail` varchar(100),
	`receptionProcess` text,
	`availableDates` json,
	`schoolType` varchar(50),
	`maxGroupSize` int DEFAULT 50,
	`capacity` int DEFAULT 0,
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exchangeSchools_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itineraryMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itineraryId` int NOT NULL,
	`memberId` int NOT NULL,
	`role` enum('guide','staff','security','coordinator','other') NOT NULL DEFAULT 'staff',
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `itineraryMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memberStatus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`itineraryId` int NOT NULL,
	`status` enum('pending','assigned','in_progress','completed','absent','cancelled') NOT NULL DEFAULT 'pending',
	`checkInTime` timestamp,
	`checkOutTime` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memberStatus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `groups` ADD `batch_id` int;--> statement-breakpoint
ALTER TABLE `groups` ADD `batch_code` varchar(32);--> statement-breakpoint
ALTER TABLE `groups` ADD `start_city` varchar(10);--> statement-breakpoint
ALTER TABLE `groups` ADD `crossing_date` date;--> statement-breakpoint
ALTER TABLE `groups` ADD `sister_school_id` int;--> statement-breakpoint
ALTER TABLE `groups` ADD `flight_info` json;--> statement-breakpoint
ALTER TABLE `groups` ADD `school_list` json;--> statement-breakpoint
ALTER TABLE `groups` DROP COLUMN `batchCode`;--> statement-breakpoint
ALTER TABLE `groups` DROP COLUMN `startCity`;--> statement-breakpoint
ALTER TABLE `groups` DROP COLUMN `flightInfo`;--> statement-breakpoint
ALTER TABLE `groups` DROP COLUMN `schoolList`;