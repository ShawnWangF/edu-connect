CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`totalStudents` int NOT NULL DEFAULT 0,
	`totalTeachers` int NOT NULL DEFAULT 0,
	`status` enum('preparing','ongoing','completed','cancelled') NOT NULL DEFAULT 'preparing',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `groups` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `itineraries` DROP COLUMN `contactPerson`;