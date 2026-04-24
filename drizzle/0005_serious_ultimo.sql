CREATE TABLE `suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`category` enum('song','venue','event','general') NOT NULL DEFAULT 'general',
	`title` varchar(255) NOT NULL,
	`description` text,
	`likes` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `interests` text;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `profileImageUrl` text;