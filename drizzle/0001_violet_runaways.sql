CREATE TABLE `card` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`person` integer NOT NULL,
	`finish` integer NOT NULL,
	`pack_id` text,
	`slot` integer,
	`acquired_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `card_owner` ON `card` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `card_pack_slot` ON `card` (`pack_id`,`slot`);--> statement-breakpoint
CREATE TABLE `pack_openings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`request_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pack_request` ON `pack_openings` (`user_id`,`request_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`packs` integer DEFAULT 0 NOT NULL,
	`opened` integer DEFAULT 0 NOT NULL,
	`bonus_started_at` integer,
	`bonus_claimed` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
-- Preserve existing anonymous IDs, balances, bonus deadlines and timestamps.
INSERT INTO users (id, packs, opened, bonus_started_at, bonus_claimed, revision, created_at, updated_at)
SELECT id, json_extract(state,'$.save.packs'), json_extract(state,'$.save.packAccess.opened'),
json_extract(state,'$.save.packAccess.bonusStartedAt'), json_extract(state,'$.save.packAccess.bonusClaimed'), revision, created_at, updated_at FROM players;
--> statement-breakpoint
-- Expand every existing duplicate into a distinct owned-card row.
WITH RECURSIVE copies(user_id, variant, n, total, acquired_at) AS (
 SELECT p.id, j.key, 1, j.value, p.updated_at FROM players p, json_each(p.state,'$.save.cards') j WHERE j.value > 0
 UNION ALL SELECT user_id, variant, n+1, total, acquired_at FROM copies WHERE n < total
) INSERT INTO card (id,user_id,person,finish,acquired_at)
SELECT lower(hex(randomblob(16))), user_id, CAST(substr(variant,1,instr(variant,'-')-1) AS INTEGER), CAST(substr(variant,instr(variant,'-')+1) AS INTEGER), acquired_at FROM copies;
--> statement-breakpoint
-- Grant the remaining cards of old unfinished packs: already-revealed cards were copied above.
INSERT INTO card (id,user_id,person,finish,pack_id,slot,acquired_at)
SELECT lower(hex(randomblob(16))), p.id, json_extract(j.value,'$.person'), json_extract(j.value,'$.finish'),
json_extract(p.state,'$.lastPack.id'), CAST(j.key AS INTEGER), p.updated_at
FROM players p, json_each(p.state,'$.lastPack.cards') j
WHERE json_extract(p.state,'$.lastPack.complete') = 0
AND CAST(j.key AS INTEGER) >= json_extract(p.state,'$.lastPack.index') + json_extract(p.state,'$.lastPack.revealed');
--> statement-breakpoint
DROP TABLE `players`;