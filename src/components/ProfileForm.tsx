"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/StatusPill";
import { Toggle } from "@/components/ui/Toggle";

export type ProfileData = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "SUPERADMIN";
  createdAt: string;
  hasPassword: boolean;
  signature: string | null;
  defaultFromName: string | null;
  defaultReplyTo: string | null;
};

export function ProfileForm({
  user,
  onSignOut,
}: {
  user: ProfileData;
  onSignOut: () => Promise<void>;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [fromName, setFromName] = useState(user.defaultFromName ?? user.name ?? "");
  const [replyTo, setReplyTo] = useState(user.defaultReplyTo ?? user.email);
  const [signature, setSignature] = useState(
    user.signature ?? "Cordialement,\nL'équipe AGEL",
  );
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, start] = useTransition();

  const [notifs, setNotifs] = useState({
    campaignComplete: true,
    sendFailed: true,
    weeklySummary: false,
    productUpdates: true,
  });

  function save() {
    start(async () => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          defaultFromName: fromName,
          defaultReplyTo: replyTo,
          signature,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Save failed");
        return;
      }
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2400);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 36 }}>
      {/* Side index */}
      <div style={{ position: "sticky", top: 24, alignSelf: "flex-start" }}>
        <div className="eyebrow" style={{ marginBottom: 10, paddingLeft: 10 }}>
          On this page
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {[
            { id: "account", label: "Account" },
            { id: "sender", label: "Sender identity" },
            { id: "security", label: "Security" },
            { id: "notifications", label: "Notifications" },
            { id: "danger", label: "Danger zone" },
          ].map((it, i) => (
            <a
              key={it.id}
              href={`#${it.id}`}
              style={{
                padding: "6px 10px",
                fontSize: 13,
                color: i === 0 ? "var(--color-maroon-700)" : "var(--color-ink-600)",
                fontWeight: i === 0 ? 500 : 400,
                borderLeft: `2px solid ${i === 0 ? "var(--color-maroon-700)" : "transparent"}`,
                borderRadius: "0 4px 4px 0",
                cursor: "pointer",
              }}
            >
              {it.label}
            </a>
          ))}
        </nav>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {/* Save bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            alignItems: "center",
            marginBottom: -12,
          }}
        >
          {savedAt && (
            <span
              style={{
                fontSize: 12,
                color: "var(--color-success-700)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--color-success-50)",
                padding: "6px 10px",
                borderRadius: 6,
              }}
            >
              <Icon name="check" size={12} strokeWidth={2.5} /> Saved
            </span>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={save}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>

        <Section title="Account" id="account">
          <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "4px 0 12px" }}>
            <Avatar name={user.name} email={user.email} size={84} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 24,
                  letterSpacing: "-0.02em",
                  marginBottom: 4,
                }}
              >
                {user.name ?? user.email}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <RoleBadge role={user.role} />
                <span className="mono" style={{ fontSize: 12, color: "var(--color-ink-400)" }}>
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="mono" style={{ fontSize: 12.5, color: "var(--color-ink-600)" }}>
                {user.email}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              paddingTop: 16,
              borderTop: "1px solid var(--color-ink-50)",
            }}
          >
            <Field label="Display name">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email" hint="Used to sign in. Change requires admin approval.">
              <input
                className="input mono"
                value={user.email}
                disabled
                style={{ fontSize: 13 }}
              />
            </Field>
          </div>
        </Section>

        <Section
          title="Sender identity"
          subtitle="Defaults that pre-fill the New Campaign form."
          id="sender"
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="From name" hint="Appears in inbox sender column.">
              <input
                className="input"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
              />
            </Field>
            <Field label="Reply-to address">
              <input
                className="input mono"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                style={{ fontSize: 13 }}
              />
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field
                label="Email signature"
                hint="Appended to the bottom of every campaign you compose."
              >
                <textarea
                  className="textarea mono"
                  rows={4}
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  style={{ fontSize: 12.5 }}
                />
              </Field>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div
                style={{
                  padding: "10px 14px",
                  background: "var(--color-blush-50)",
                  border: "1px solid var(--color-blush-200)",
                  borderRadius: 8,
                  fontSize: 12.5,
                  color: "var(--color-ink-700)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Icon name="info" size={14} style={{ color: "var(--color-ink-400)" }} />
                Every send goes through{" "}
                <span className="mono" style={{ color: "var(--color-ink-800)" }}>
                  outreach@groupe-agel.com
                </span>
                . Your display name shows in the inbox sender column; replies route to the reply-to.
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Security"
          subtitle="Sign-in methods and active sessions."
          id="security"
        >
          <SecurityRow
            icon="lock"
            title="Password"
            detail={
              user.hasPassword
                ? "Last set in your account settings."
                : "No password set — using temporary access"
            }
            action={<button type="button" className="btn btn-secondary btn-sm">Change password</button>}
            warn={!user.hasPassword}
          />
          <SecurityRow
            icon="sparkle"
            title="Two-factor authentication"
            detail="Add an extra layer to your sign-in."
            action={
              <button type="button" className="btn btn-secondary btn-sm">
                <Icon name="plus" size={12} /> Enable 2FA
              </button>
            }
          />
          <SecurityRow
            icon="settings"
            title="Active sessions"
            detail="Browser sessions tied to this account."
            action={<button type="button" className="btn btn-ghost btn-sm">Manage</button>}
          />
        </Section>

        <Section
          title="Notifications"
          subtitle="When AGEL Outreach should reach you."
          id="notifications"
        >
          <NotifRow
            title="Campaign complete"
            detail="Email when one of your campaigns finishes sending."
            value={notifs.campaignComplete}
            onChange={(v) => setNotifs({ ...notifs, campaignComplete: v })}
          />
          <NotifRow
            title="Send failed"
            detail="Email when any recipient fails (bounce, hard fail, retry exhausted)."
            value={notifs.sendFailed}
            onChange={(v) => setNotifs({ ...notifs, sendFailed: v })}
            urgent
          />
          <NotifRow
            title="Weekly summary"
            detail="Every Monday: open rates, top performers, and template usage."
            value={notifs.weeklySummary}
            onChange={(v) => setNotifs({ ...notifs, weeklySummary: v })}
          />
          <NotifRow
            title="Product updates"
            detail="New features, breaking changes, scheduled maintenance."
            value={notifs.productUpdates}
            onChange={(v) => setNotifs({ ...notifs, productUpdates: v })}
          />
        </Section>

        <Section title="Danger zone" tone="danger" id="danger">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink-800)" }}>
                Sign out of all devices
              </div>
              <div style={{ fontSize: 12.5, color: "var(--color-ink-600)", marginTop: 2 }}>
                Revoke every session — including this one. You&apos;ll need to sign in again.
              </div>
            </div>
            <form action={onSignOut}>
              <button type="submit" className="btn btn-danger">
                <Icon name="logout" size={14} /> Sign out everywhere
              </button>
            </form>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  id,
  tone,
  children,
}: {
  title: string;
  subtitle?: string;
  id?: string;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="card"
      style={{
        padding: 24,
        borderColor: tone === "danger" ? "#f3c5c0" : "var(--color-ink-100)",
        background:
          tone === "danger"
            ? "linear-gradient(180deg, var(--color-danger-50) 0%, #ffffff 60%)"
            : "#ffffff",
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: "-0.015em",
            color: tone === "danger" ? "var(--color-danger-700)" : "var(--color-ink-800)",
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-ink-600)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function SecurityRow({
  icon,
  title,
  detail,
  action,
  warn,
}: {
  icon: "lock" | "sparkle" | "settings";
  title: string;
  detail: string;
  action: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 0",
        borderTop: "1px solid var(--color-ink-50)",
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: warn ? "var(--color-warning-50)" : "var(--color-blush-50)",
          color: warn ? "var(--color-warning-700)" : "var(--color-maroon-700)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-ink-800)" }}>
          {title}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: warn ? "var(--color-warning-700)" : "var(--color-ink-600)",
            marginTop: 1,
          }}
        >
          {detail}
        </div>
      </div>
      {action}
    </div>
  );
}

function NotifRow({
  title,
  detail,
  value,
  onChange,
  urgent,
}: {
  title: string;
  detail: string;
  value: boolean;
  onChange: (v: boolean) => void;
  urgent?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 0",
        borderTop: "1px solid var(--color-ink-50)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-ink-800)" }}>
            {title}
          </span>
          {urgent && (
            <span
              className="badge"
              style={{
                background: "var(--color-danger-50)",
                color: "var(--color-danger-700)",
              }}
            >
              Urgent
            </span>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--color-ink-600)", marginTop: 1 }}>
          {detail}
        </div>
      </div>
      <Toggle value={value} onChange={onChange} ariaLabel={title} />
    </div>
  );
}
