CREATE TABLE "clubs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"race" text NOT NULL,
	"hometown" text NOT NULL,
	"division" text NOT NULL,
	"position" integer DEFAULT 1 NOT NULL,
	"gold" integer DEFAULT 200000 NOT NULL,
	"merit" integer DEFAULT 0 NOT NULL,
	"marathon_points" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"goals_for" integer DEFAULT 0 NOT NULL,
	"goals_against" integer DEFAULT 0 NOT NULL,
	"record_string" text DEFAULT '0/0/0' NOT NULL,
	"presentation" text DEFAULT '' NOT NULL,
	"owner_name" text NOT NULL,
	"owner_email" text DEFAULT '' NOT NULL,
	"is_bot" boolean DEFAULT false NOT NULL,
	"doctor_investment" integer DEFAULT 1000 NOT NULL,
	"magic_investment" integer DEFAULT 0 NOT NULL,
	"training_points" jsonb NOT NULL,
	"lineup" jsonb NOT NULL,
	"coach" jsonb,
	"arena" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"season" integer DEFAULT 1 NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"division" text NOT NULL,
	"home_club_id" text NOT NULL,
	"away_club_id" text NOT NULL,
	"home_score" integer NOT NULL,
	"away_score" integer NOT NULL,
	"match_report" jsonb NOT NULL,
	"played_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"club_id" text NOT NULL,
	"name" text NOT NULL,
	"race" text NOT NULL,
	"shirt_number" integer NOT NULL,
	"hometown" text NOT NULL,
	"nominal_position" text NOT NULL,
	"wage" integer NOT NULL,
	"is_mercenary" boolean DEFAULT false NOT NULL,
	"matches" integer DEFAULT 0 NOT NULL,
	"season_matches" integer DEFAULT 0 NOT NULL,
	"goals" integer DEFAULT 0 NOT NULL,
	"season_goals" integer DEFAULT 0 NOT NULL,
	"basket_goals" integer DEFAULT 0 NOT NULL,
	"season_basket_goals" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	"season_assists" integer DEFAULT 0 NOT NULL,
	"form" integer DEFAULT 9 NOT NULL,
	"total_injury" double precision DEFAULT 0 NOT NULL,
	"current_injury" integer DEFAULT 0 NOT NULL,
	"is_deceased" boolean DEFAULT false NOT NULL,
	"attributes" jsonb NOT NULL,
	"artifacts" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shoutbox_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"author_name" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tipset_coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"club_id" text NOT NULL,
	"season" integer DEFAULT 1 NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"predictions" jsonb NOT NULL,
	"points_awarded" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"manager_name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "world_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"season" integer DEFAULT 1 NOT NULL,
	"round" integer DEFAULT 0 NOT NULL,
	"day" integer DEFAULT 0 NOT NULL,
	"total_matches_played" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_club_id_clubs_id_fk" FOREIGN KEY ("home_club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_club_id_clubs_id_fk" FOREIGN KEY ("away_club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tipset_coupons" ADD CONSTRAINT "tipset_coupons_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;