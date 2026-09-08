-- Owner-requested repeat cleanup, including users created since the last reset.
DELETE FROM card;
--> statement-breakpoint
DELETE FROM pack_openings;
--> statement-breakpoint
DELETE FROM users;
