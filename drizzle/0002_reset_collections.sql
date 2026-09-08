-- One-time owner-requested reset of player data; keep schema and migration history.
DELETE FROM card;
--> statement-breakpoint
DELETE FROM pack_openings;
--> statement-breakpoint
DELETE FROM users;
