CREATE TABLE `mcp_servers` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`transport` text DEFAULT 'stdio' NOT NULL,
	`command` text,
	`args` text,
	`url` text,
	`env` text,
	`enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mcp_servers_name_unique` ON `mcp_servers` (`name`);
