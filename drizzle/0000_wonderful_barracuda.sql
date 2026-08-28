CREATE TABLE "film" (
	"film_id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"release_year" smallint,
	"language_id" smallint NOT NULL,
	"rental_rate" numeric(4, 2) DEFAULT '4.99' NOT NULL,
	"last_update" timestamp with time zone DEFAULT now() NOT NULL
);
