export type CampaignStatus =
  | "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "FAILED";
export type RecipientStatus =
  | "QUEUED" | "SENT" | "DELIVERED" | "OPENED" | "BOUNCED" | "COMPLAINED" | "FAILED";

const CLASS: Record<string, string> = {
  DRAFT: "pill pill-draft",
  SCHEDULED: "pill pill-scheduled",
  SENDING: "pill pill-sending",
  SENT: "pill pill-sent",
  FAILED: "pill pill-failed",
  QUEUED: "pill pill-queued",
  DELIVERED: "pill pill-delivered",
  OPENED: "pill pill-opened",
  BOUNCED: "pill pill-bounced",
  COMPLAINED: "pill pill-complained",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={CLASS[status] ?? "pill pill-draft"}>{status}</span>;
}

export function RoleBadge({ role }: { role: "USER" | "SUPERADMIN" }) {
  return (
    <span className={role === "SUPERADMIN" ? "badge badge-brand" : "badge"}>
      {role}
    </span>
  );
}
