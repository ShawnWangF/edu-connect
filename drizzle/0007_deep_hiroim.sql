CREATE TABLE `guides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`phone` varchar(50),
	`languages` text,
	`specialties` text,
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `securities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`phone` varchar(50),
	`idCard` varchar(50),
	`company` varchar(255),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `securities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `groups` MODIFY COLUMN `type` json NOT NULL;