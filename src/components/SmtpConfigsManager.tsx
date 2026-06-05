"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Toggle } from "@/components/ui/Toggle";
import type { SmtpConfig } from "@/components/ProfileForm";

type Provider = "outlook" | "hostinger" | "custom";

const PRESETS: Record<Provider, { host: string; port: number; secure: boolean }> = {
  outlook: { host: "smtp.office365.com", port: 587, secure: false },
  hostinger: { host: "smtp.hostinger.com", port: 465, secure: true },
  custom: { host: "", port: 465, secure: true },
};

type Draft = {
  name: string;
  provider: Provider;
  host: string;
  port: string;
  secure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
};

function emptyDraft(provider: Provider = "hostinger"): Draft {
  const preset = PRESETS[provider];
  return {
    name: "",
    provider,
    host: preset.host,
    port: String(preset.port),
    secure: preset.secure,
    smtpUser: "",
    smtpPassword: "",
    fromEmail: "",
  };
}

export function SmtpConfigsManager({
  initialConfigs,
}: {
  initialConfigs: SmtpConfig[];
}) {
  const router = useRouter();
  const [configs, setConfigs] = useState(initialConfigs);
  const [isAdding, setIsAdding] = useState(initialConfigs.length === 0);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [setAsDefault, setSetAsDefault] = useState(initialConfigs.length === 0);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  function applyProvider(provider: Provider) {
    const preset = PRESETS[provider];
    setDraft((d) => ({
      ...d,
      provider,
      host: preset.host,
      port: String(preset.port),
      secure: preset.secure,
    }));
  }

  async function saveDraft() {
    setAddError(null);
    if (!draft.name.trim()) {
      setAddError("Give this configuration a name.");
      return;
    }
    if (!draft.host || !draft.smtpUser || !draft.smtpPassword) {
      setAddError("Host, username and password are required.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/profile/smtp-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          provider: draft.provider,
          host: draft.host.trim(),
          port: Number(draft.port),
          secure: draft.secure,
          smtpUser: draft.smtpUser.trim(),
          smtpPassword: draft.smtpPassword,
          fromEmail: draft.fromEmail.trim() || null,
          setAsDefault,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError(data.error ?? "Save failed");
        return;
      }
      setIsAdding(false);
      setDraft(emptyDraft());
      setSetAsDefault(false);
      router.refresh();
      // Optimistically refresh local list
      const reload = await fetch("/api/profile/smtp-configs");
      if (reload.ok) {
        const fresh = await reload.json();
        setConfigs(fresh.configs as SmtpConfig[]);
      }
    } finally {
      setAdding(false);
    }
  }

  async function deleteConfig(id: string) {
    if (!confirm("Delete this mail server configuration?")) return;
    const res = await fetch(`/api/profile/smtp-configs/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("Delete failed");
      return;
    }
    setConfigs(configs.filter((c) => c.id !== id));
    router.refresh();
  }

  async function setDefault(id: string) {
    const res = await fetch(`/api/profile/smtp-configs/${id}/default`, {
      method: "POST",
    });
    if (!res.ok) return;
    setConfigs(configs.map((c) => ({ ...c, isDefault: c.id === id })));
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {configs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {configs.map((c) => (
            <ConfigRow
              key={c.id}
              config={c}
              onDelete={() => deleteConfig(c.id)}
              onSetDefault={() => setDefault(c.id)}
            />
          ))}
        </div>
      )}

      {isAdding ? (
        <AddConfigForm
          draft={draft}
          setDraft={setDraft}
          applyProvider={applyProvider}
          setAsDefault={setAsDefault}
          setSetAsDefault={setSetAsDefault}
          configsCount={configs.length}
          adding={adding}
          error={addError}
          onCancel={
            configs.length > 0
              ? () => {
                  setIsAdding(false);
                  setDraft(emptyDraft());
                  setAddError(null);
                }
              : undefined
          }
          onSave={saveDraft}
        />
      ) : (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setIsAdding(true);
            setDraft(emptyDraft());
            setSetAsDefault(false);
            setAddError(null);
          }}
          style={{ alignSelf: "flex-start" }}
        >
          <Icon name="plus" size={14} /> Add another configuration
        </button>
      )}
    </div>
  );
}

function ConfigRow({
  config,
  onDelete,
  onSetDefault,
}: {
  config: SmtpConfig;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: true } | { ok: false; error: string } | null
  >(null);

  async function test() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/profile/smtp-configs/${config.id}/test`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setTestResult({ ok: true });
      } else {
        setTestResult({ ok: false, error: data.error ?? "Connection failed" });
      }
    } finally {
      setTesting(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 16,
        background: "#ffffff",
        border: "1px solid var(--color-ink-100)",
        borderRadius: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <ProviderBadge provider={config.provider} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--color-ink-800)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {config.name}
              {config.isDefault && (
                <span
                  style={{
                    fontSize: 10.5,
                    padding: "2px 6px",
                    background: "var(--color-success-50)",
                    color: "var(--color-success-700)",
                    borderRadius: 4,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Default
                </span>
              )}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 12,
                color: "var(--color-ink-600)",
                marginTop: 2,
              }}
            >
              {config.smtpUser} · {config.host}:{config.port}{" "}
              {config.secure ? "(SSL)" : "(STARTTLS)"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {!config.isDefault && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onSetDefault}
            >
              Set as default
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={test}
            disabled={testing}
          >
            {testing ? "Testing…" : "Test"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onDelete}
            style={{ color: "var(--color-danger-700)" }}
          >
            <Icon name="trash" size={12} />
          </button>
        </div>
      </div>

      {testResult?.ok === true && (
        <div
          style={{
            fontSize: 12.5,
            color: "var(--color-success-700)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon name="check" size={12} strokeWidth={2.5} />
          Connected — credentials are valid.
        </div>
      )}
      {testResult?.ok === false && (
        <div style={{ fontSize: 12.5, color: "var(--color-danger-700)" }}>
          {testResult.error}
        </div>
      )}
    </div>
  );
}

function ProviderBadge({ provider }: { provider: Provider }) {
  const colors: Record<Provider, { bg: string; fg: string }> = {
    outlook: { bg: "#dbe7fd", fg: "#1e4ec7" },
    hostinger: { bg: "var(--color-blush-50)", fg: "var(--color-maroon-700)" },
    custom: { bg: "var(--color-ink-50)", fg: "var(--color-ink-700)" },
  };
  const c = colors[provider];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: 8,
        background: c.bg,
        color: c.fg,
        flexShrink: 0,
      }}
    >
      <Icon name="mail" size={16} />
    </span>
  );
}

function AddConfigForm({
  draft,
  setDraft,
  applyProvider,
  setAsDefault,
  setSetAsDefault,
  configsCount,
  adding,
  error,
  onCancel,
  onSave,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  applyProvider: (p: Provider) => void;
  setAsDefault: boolean;
  setSetAsDefault: (v: boolean) => void;
  configsCount: number;
  adding: boolean;
  error: string | null;
  onCancel?: () => void;
  onSave: () => void;
}) {
  return (
    <div
      style={{
        padding: 20,
        background: "#ffffff",
        border: "1px solid var(--color-ink-100)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: "var(--color-ink-700)",
            marginBottom: 8,
          }}
        >
          Provider
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ProviderPick
            label="Outlook / Microsoft 365"
            selected={draft.provider === "outlook"}
            onClick={() => applyProvider("outlook")}
          />
          <ProviderPick
            label="Hostinger"
            selected={draft.provider === "hostinger"}
            onClick={() => applyProvider("hostinger")}
          />
          <ProviderPick
            label="Custom"
            selected={draft.provider === "custom"}
            onClick={() => applyProvider("custom")}
          />
        </div>
      </div>

      <FormField label="Name">
        <input
          className="input"
          placeholder="e.g. Yassine — Outlook work"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        />
      </FormField>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FormField label="SMTP host">
          <input
            className="input mono"
            placeholder="smtp.hostinger.com"
            value={draft.host}
            onChange={(e) => setDraft((d) => ({ ...d, host: e.target.value }))}
            style={{ fontSize: 13 }}
          />
        </FormField>
        <FormField label="Port">
          <input
            className="input mono"
            inputMode="numeric"
            placeholder="465"
            value={draft.port}
            onChange={(e) =>
              setDraft((d) => ({ ...d, port: e.target.value.replace(/[^0-9]/g, "") }))
            }
            style={{ fontSize: 13 }}
          />
        </FormField>
        <FormField label="Username">
          <input
            className="input mono"
            placeholder="you@agelpartners.com"
            value={draft.smtpUser}
            onChange={(e) => setDraft((d) => ({ ...d, smtpUser: e.target.value }))}
            style={{ fontSize: 13 }}
          />
        </FormField>
        <FormField label="Password" hint="Stored encrypted with AES-256-GCM.">
          <input
            className="input mono"
            type="password"
            placeholder="Mailbox password"
            value={draft.smtpPassword}
            onChange={(e) => setDraft((d) => ({ ...d, smtpPassword: e.target.value }))}
            autoComplete="new-password"
            style={{ fontSize: 13 }}
          />
        </FormField>
        <FormField
          label="From address"
          hint="Address recipients see. Must be owned by the SMTP user."
        >
          <input
            className="input mono"
            placeholder={draft.smtpUser || "outreach@agelpartners.com"}
            value={draft.fromEmail}
            onChange={(e) => setDraft((d) => ({ ...d, fromEmail: e.target.value }))}
            style={{ fontSize: 13 }}
          />
        </FormField>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            paddingTop: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: "var(--color-ink-800)", fontWeight: 500 }}>
              Secure (TLS)
            </div>
            <div style={{ fontSize: 12, color: "var(--color-ink-600)", marginTop: 2 }}>
              On for port 465; off for 587 (STARTTLS).
            </div>
          </div>
          <Toggle
            value={draft.secure}
            onChange={(v) => setDraft((d) => ({ ...d, secure: v }))}
          />
        </div>
      </div>

      {configsCount > 0 && (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--color-ink-700)",
          }}
        >
          <input
            type="checkbox"
            checked={setAsDefault}
            onChange={(e) => setSetAsDefault(e.target.checked)}
          />
          Use this as my default mail server
        </label>
      )}

      {error && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 6,
            background: "var(--color-danger-50)",
            color: "var(--color-danger-700)",
            border: "1px solid #f3c5c0",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSave}
          disabled={adding}
        >
          {adding ? "Saving…" : "Save configuration"}
        </button>
      </div>
    </div>
  );
}

function ProviderPick({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        border: `1.5px solid ${selected ? "var(--color-maroon-700)" : "var(--color-ink-100)"}`,
        background: selected ? "var(--color-blush-50)" : "#ffffff",
        color: selected ? "var(--color-maroon-700)" : "var(--color-ink-700)",
        fontSize: 13,
        fontWeight: selected ? 600 : 500,
        cursor: "pointer",
        fontFamily: "inherit",
        flex: 1,
      }}
    >
      {label}
    </button>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          color: "var(--color-ink-700)",
        }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ fontSize: 11.5, color: "var(--color-ink-500)" }}>{hint}</span>
      )}
    </label>
  );
}
