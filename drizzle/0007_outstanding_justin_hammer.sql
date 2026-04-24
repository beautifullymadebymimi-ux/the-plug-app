CREATE TABLE `member_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` int NOT NULL,
	`note` text,
	`recordedBy` int NOT NULL,
	`paymentMethod` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `member_payments_id` PRIMARY KEY(`id`)
);
