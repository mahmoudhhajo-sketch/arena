CREATE TABLE "game_records" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" ALTER COLUMN "club_id" DROP NOT NULL;