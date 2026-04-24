ALTER TABLE `member_profiles` MODIFY COLUMN `userId` int;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `name` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `memberRole` varchar(128);