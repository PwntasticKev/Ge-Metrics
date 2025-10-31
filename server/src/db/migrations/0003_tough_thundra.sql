CREATE TABLE "blogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"date" timestamp NOT NULL,
	"url" text NOT NULL,
	"category" text,
	"content" text,
	"year" integer,
	"month" integer,
	"day" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "blogs_date_idx" ON "blogs" USING btree ("date");--> statement-breakpoint
CREATE INDEX "blogs_year_idx" ON "blogs" USING btree ("year");--> statement-breakpoint
CREATE INDEX "blogs_category_idx" ON "blogs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "blogs_url_idx" ON "blogs" USING btree ("url");--> statement-breakpoint
CREATE UNIQUE INDEX "blogs_date_url_idx" ON "blogs" USING btree ("date","url");