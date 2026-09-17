CREATE TABLE `googleConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`encryptedAccessToken` text NOT NULL,
	`encryptedRefreshToken` text,
	`expiresAt` timestamp,
	`scopes` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `googleConnections_id` PRIMARY KEY(`id`),
	CONSTRAINT `googleConnections_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `googleOAuthStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`state` varchar(180) NOT NULL,
	`userId` int NOT NULL,
	`redirectUri` varchar(500) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `googleOAuthStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `googleOAuthStates_state_unique` UNIQUE(`state`)
);
