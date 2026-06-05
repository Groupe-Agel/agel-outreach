CREATE TABLE "smtp_config" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"provider" text DEFAULT 'custom' NOT NULL,
	"host" text NOT NULL,
	"port" integer NOT NULL,
	"secure" boolean NOT NULL,
	"smtp_user" text NOT NULL,
	"pass_encrypted" text NOT NULL,
	"from_email" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "smtp_config" ADD CONSTRAINT "smtp_config_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "smtp_config_user_idx" ON "smtp_config" USING btree ("user_id");