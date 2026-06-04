ALTER TABLE "user" ADD COLUMN "smtp_host" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "smtp_port" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "smtp_secure" boolean;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "smtp_user" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "smtp_pass_encrypted" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "smtp_from_email" text;