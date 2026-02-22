CREATE TABLE `restaurants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`phone` varchar(50),
	`capacity` int NOT NULL DEFAULT 0,
	`cuisine` varchar(100),
	`priceRange` varchar(50),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `restaurants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`region` varchar(50),
	`contactPerson` varchar(100),
	`contactPhone` varchar(50),
	`contactEmail` varchar(100),
	`receptionProcess` text,
	`availableTimeSlots` json,
	`capacity` int DEFAULT 0,
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schools_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templateItineraries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`dayNumber` int NOT NULL,
	`timeSlot` varchar(20),
	`startTime` varchar(10),
	`endTime` varchar(10),
	`locationId` int,
	`locationName` varchar(255),
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `templateItineraries_id` PRIMARY KEY(`id`)
);
