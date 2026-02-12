CREATE TABLE `dailyCards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`date` date NOT NULL,
	`departureTime` varchar(10),
	`arrivalTime` varchar(10),
	`departurePlace` varchar(255),
	`arrivalPlace` varchar(255),
	`transportContact` varchar(100),
	`flightNumber` varchar(50),
	`airline` varchar(100),
	`terminal` varchar(50),
	`transportNotes` text,
	`departureCity` varchar(100),
	`arrivalCity` varchar(100),
	`weatherData` json,
	`hotelName` varchar(255),
	`hotelAddress` text,
	`vehiclePlate` varchar(50),
	`driverName` varchar(100),
	`driverPhone` varchar(50),
	`guideName` varchar(100),
	`guidePhone` varchar(50),
	`securityName` varchar(100),
	`securityPhone` varchar(50),
	`breakfastRestaurant` varchar(255),
	`breakfastAddress` text,
	`lunchRestaurant` varchar(255),
	`lunchAddress` text,
	`dinnerRestaurant` varchar(255),
	`dinnerAddress` text,
	`specialNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyCards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int,
	`name` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`url` text NOT NULL,
	`mimeType` varchar(100),
	`size` int,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(64) NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`days` int NOT NULL,
	`type` enum('elementary','middle','vip') NOT NULL,
	`status` enum('preparing','ongoing','completed','cancelled') NOT NULL DEFAULT 'preparing',
	`studentCount` int NOT NULL DEFAULT 0,
	`teacherCount` int NOT NULL DEFAULT 0,
	`totalCount` int NOT NULL DEFAULT 0,
	`hotel` text,
	`color` varchar(7) DEFAULT '#52c41a',
	`tags` text,
	`contact` varchar(100),
	`phone` varchar(50),
	`emergencyContact` varchar(100),
	`emergencyPhone` varchar(50),
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `groups_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `hotels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`contact` varchar(100),
	`phone` varchar(50),
	`roomCount` int DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hotels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itineraries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`date` date NOT NULL,
	`dayNumber` int NOT NULL,
	`startTime` varchar(10),
	`endTime` varchar(10),
	`locationId` int,
	`locationName` varchar(255),
	`description` text,
	`notes` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `itineraries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`capacity` int NOT NULL DEFAULT 0,
	`applicableType` enum('all','elementary','middle','vip') NOT NULL DEFAULT 'all',
	`restrictedDays` varchar(100),
	`contact` varchar(100),
	`phone` varchar(50),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`identity` enum('student','teacher','staff','other') NOT NULL,
	`gender` enum('male','female','other'),
	`phone` varchar(50),
	`idCard` varchar(50),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('reminder','deadline','departure','change') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text,
	`relatedGroupId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('manual','auto') NOT NULL,
	`summary` text,
	`token` varchar(64) NOT NULL,
	`data` json NOT NULL,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `snapshots_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('elementary','middle','vip') NOT NULL,
	`days` int NOT NULL,
	`content` json NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plate` varchar(50) NOT NULL,
	`driverName` varchar(100),
	`driverPhone` varchar(50),
	`capacity` int DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicles_plate_unique` UNIQUE(`plate`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','editor','viewer') NOT NULL DEFAULT 'viewer';--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `password` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `isOnline` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);