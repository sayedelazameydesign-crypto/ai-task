ALTER TABLE `tasks` MODIFY COLUMN `status` enum('queued','planning','running','waiting_approval','paused','failed','completed','cancelled','dead_letter') NOT NULL DEFAULT 'queued';--> statement-breakpoint
ALTER TABLE `approvals` ADD `riskLevel` varchar(24) DEFAULT 'high' NOT NULL;--> statement-breakpoint
ALTER TABLE `approvals` ADD `requiredPermission` varchar(160);--> statement-breakpoint
ALTER TABLE `approvals` ADD `resourceScope` varchar(300);--> statement-breakpoint
ALTER TABLE `tasks` ADD `attemptCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `maxAttempts` int DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `idempotencyKey` varchar(160);--> statement-breakpoint
ALTER TABLE `tasks` ADD `workerId` varchar(100);--> statement-breakpoint
ALTER TABLE `tasks` ADD `lockedAt` timestamp;--> statement-breakpoint
ALTER TABLE `tasks` ADD `heartbeatAt` timestamp;--> statement-breakpoint
ALTER TABLE `tasks` ADD `leaseTimeout` int DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `nextRetryAt` timestamp;