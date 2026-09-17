CREATE TABLE `integrationSecrets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(60) NOT NULL,
	`encryptedClientId` text NOT NULL,
	`encryptedClientSecret` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `integrationSecrets_id` PRIMARY KEY(`id`),
	CONSTRAINT `integrationSecrets_provider_unique` UNIQUE(`provider`)
);
