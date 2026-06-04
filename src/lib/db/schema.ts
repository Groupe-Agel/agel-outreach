import { nanoid } from "nanoid";
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  primaryKey,
  pgEnum,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => nanoid(21));

// ---------- Users / Auth ----------

export const userRole = pgEnum("user_role", ["USER", "SUPERADMIN"]);

export const users = pgTable("user", {
  id: id(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: userRole("role").notNull().default("USER"),
  passwordHash: text("password_hash"),
  signature: text("signature"),
  defaultFromName: text("default_from_name"),
  defaultReplyTo: text("default_reply_to"),
  // Per-user SMTP configuration. When set, outgoing mail for this user's
  // campaigns is sent through their own SMTP rather than the env-level default.
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpSecure: boolean("smtp_secure"),
  smtpUser: text("smtp_user"),
  smtpPassEncrypted: text("smtp_pass_encrypted"),
  smtpFromEmail: text("smtp_from_email"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type UserRole = (typeof userRole.enumValues)[number];

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ---------- Domain ----------

export const campaignStatus = pgEnum("campaign_status", [
  "DRAFT",
  "SCHEDULED",
  "SENDING",
  "SENT",
  "FAILED",
]);

export const recipientStatus = pgEnum("recipient_status", [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "BOUNCED",
  "COMPLAINED",
  "FAILED",
  "OPENED",
]);

export const templates = pgTable(
  "template",
  {
    id: id(),
    name: text("name").notNull(),
    description: text("description"),
    mjmlSource: text("mjml_source").notNull(),
    subjectTpl: text("subject_tpl").notNull(),
    variables: text("variables").array().notNull().default([]),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("template_created_by_idx").on(t.createdById)],
);

export const contactLists = pgTable(
  "contact_list",
  {
    id: id(),
    name: text("name").notNull(),
    description: text("description"),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("contact_list_created_by_idx").on(t.createdById)],
);

export const contactListMembers = pgTable(
  "contact_list_member",
  {
    id: id(),
    listId: text("list_id")
      .notNull()
      .references(() => contactLists.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    mergeData: jsonb("merge_data").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("contact_list_member_list_idx").on(t.listId),
    index("contact_list_member_unique").on(t.listId, t.email),
  ],
);

export const campaigns = pgTable(
  "campaign",
  {
    id: id(),
    name: text("name"),
    templateId: text("template_id")
      .notNull()
      .references(() => templates.id),
    subjectTpl: text("subject_tpl").notNull(),
    fromName: text("from_name").notNull(),
    fromEmail: text("from_email").notNull(),
    replyTo: text("reply_to").notNull(),
    scheduledAt: timestamp("scheduled_at"),
    status: campaignStatus("status").notNull().default("DRAFT"),
    totalCount: integer("total_count").notNull().default(0),
    sentCount: integer("sent_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    openedCount: integer("opened_count").notNull().default(0),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (t) => [
    index("campaign_status_scheduled_idx").on(t.status, t.scheduledAt),
    index("campaign_created_by_idx").on(t.createdById),
  ],
);

export const recipients = pgTable(
  "recipient",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    mergeData: jsonb("merge_data").notNull(),
    status: recipientStatus("status").notNull().default("QUEUED"),
    resendId: text("resend_id"),
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    openedAt: timestamp("opened_at"),
    bouncedAt: timestamp("bounced_at"),
  },
  (t) => [
    index("recipient_campaign_idx").on(t.campaignId),
    index("recipient_resend_idx").on(t.resendId),
    index("recipient_status_idx").on(t.status),
  ],
);

export const apiTokens = pgTable(
  "api_token",
  {
    id: id(),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    prefix: text("prefix").notNull(),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => [index("api_token_created_by_idx").on(t.createdById)],
);

// ---------- Relations ----------

export const usersRelations = relations(users, ({ many }) => ({
  templates: many(templates),
  campaigns: many(campaigns),
  apiTokens: many(apiTokens),
  contactLists: many(contactLists),
}));

export const contactListsRelations = relations(contactLists, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [contactLists.createdById],
    references: [users.id],
  }),
  members: many(contactListMembers),
}));

export const contactListMembersRelations = relations(
  contactListMembers,
  ({ one }) => ({
    list: one(contactLists, {
      fields: [contactListMembers.listId],
      references: [contactLists.id],
    }),
  }),
);

export const templatesRelations = relations(templates, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [templates.createdById],
    references: [users.id],
  }),
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  template: one(templates, {
    fields: [campaigns.templateId],
    references: [templates.id],
  }),
  createdBy: one(users, {
    fields: [campaigns.createdById],
    references: [users.id],
  }),
  recipients: many(recipients),
}));

export const recipientsRelations = relations(recipients, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [recipients.campaignId],
    references: [campaigns.id],
  }),
}));

// ---------- Inferred types ----------

export type User = typeof users.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type Recipient = typeof recipients.$inferSelect;
export type NewRecipient = typeof recipients.$inferInsert;
export type ApiToken = typeof apiTokens.$inferSelect;
export type CampaignStatus = (typeof campaignStatus.enumValues)[number];
export type RecipientStatus = (typeof recipientStatus.enumValues)[number];
