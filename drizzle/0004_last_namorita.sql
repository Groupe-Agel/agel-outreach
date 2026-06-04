CREATE TABLE "contact_list_member" (
	"id" text PRIMARY KEY NOT NULL,
	"list_id" text NOT NULL,
	"email" text NOT NULL,
	"merge_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_list" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_list_member" ADD CONSTRAINT "contact_list_member_list_id_contact_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."contact_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_list" ADD CONSTRAINT "contact_list_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_list_member_list_idx" ON "contact_list_member" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "contact_list_member_unique" ON "contact_list_member" USING btree ("list_id","email");--> statement-breakpoint
CREATE INDEX "contact_list_created_by_idx" ON "contact_list" USING btree ("created_by_id");