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
SET @itineraries_contact_person_exists = (
	SELECT COUNT(*)
	FROM INFORMATION_SCHEMA.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE()
		AND TABLE_NAME = 'itineraries'
		AND COLUMN_NAME = 'contactPerson'
);--> statement-breakpoint
SET @drop_itineraries_contact_person = IF(
	@itineraries_contact_person_exists > 0,
	'ALTER TABLE `itineraries` DROP COLUMN `contactPerson`',
	'SELECT 1'
);--> statement-breakpoint
PREPARE drop_itineraries_contact_person_stmt FROM @drop_itineraries_contact_person;--> statement-breakpoint
EXECUTE drop_itineraries_contact_person_stmt;--> statement-breakpoint
DEALLOCATE PREPARE drop_itineraries_contact_person_stmt;
