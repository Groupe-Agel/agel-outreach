"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";

type Token = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type FreshToken = {
  id: string;
  name: string;
  prefix: string;
  value: string;
};

export function ApiTokensManager({ initial }: { initial: Token[] }) {
  const router = useRouter();
  const [tokens, setTokens] = useState(initial);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<FreshToken | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function create() {
    if (!name.trim()) return;
    start(async () => {
      const res = await fetch("/api/api-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed");
        return;
      }
      setFresh({ id: data.id, name, prefix: data.prefix, value: data.token });
      setCopied(false);
      setTokens((prev) => [
        {
          id: data.id,
          name,
          prefix: data.prefix,
          createdAt: new Date().toISOString(),
          lastUsedAt: null,
          revokedAt: null,
        },
        ...prev,
      ]);
      setName("");
      router.refresh();
    });
  }

  function revoke(id: string) {
    if (!confirm("Revoke this token? Any clients using it will start failing.")) return;
    start(async () => {
      await fetch(`/api/api-tokens/${id}`, { method: "DELETE" });
      setTokens((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, revokedAt: new Date().toISOString() } : t,
        ),
      );
      router.refresh();
    });
  }

  const active = tokens.filter((t) => !t.revokedAt);

  return (
    <div>
      {fresh && (
        <FreshTokenCard
          token={fresh}
          copied={copied}
          onCopy={() => {
            navigator.clipboard?.writeText(fresh.value);
            setCopied(true);
          }}
          onDismiss={() => setFresh(null)}
        />
      )}

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Create new token</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="input"
            placeholder="Token name (e.g. ‘Production CI’)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={!name || pending}
            onClick={create}
          >
            <Icon name="key" size={14} /> Generate token
          </button>
        </div>
      </div>

      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Active tokens ({active.length})
      </div>
      {tokens.length === 0 ? (
        <EmptyState
          icon="key"
          title="No API tokens yet"
          description="Generate a token above to use AGEL Outreach from scripts, schedulers, or your own apps."
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {tokens.map((t, i) => (
            <div
              key={t.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 200px 200px 100px",
                gap: 20,
                padding: "14px 20px",
                alignItems: "center",
                borderTop: i > 0 ? "1px solid var(--color-ink-100)" : "none",
                opacity: t.revokedAt ? 0.6 : 1,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink-800)" }}>
                  {t.name}
                  {t.revokedAt && (
                    <span
                      className="mono"
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        color: "var(--color-danger-700)",
                        fontWeight: 500,
                      }}
                    >
                      REVOKED
                    </span>
                  )}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 11.5, color: "var(--color-ink-400)", marginTop: 2 }}
                >
                  {t.prefix}••• · created{" "}
                  {new Date(t.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--color-ink-400)" }}>
                Last used{" "}
                <span style={{ color: "var(--color-ink-700)" }}>
                  {t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleDateString() : "never"}
                </span>
              </div>
              <div className="mono" style={{ fontSize: 12, color: "var(--color-ink-400)" }}>
                {t.revokedAt
                  ? `revoked ${new Date(t.revokedAt).toLocaleDateString()}`
                  : "active"}
              </div>
              <div style={{ textAlign: "right" }}>
                {!t.revokedAt && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => revoke(t.id)}
                    disabled={pending}
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FreshTokenCard({
  token,
  copied,
  onCopy,
  onDismiss,
}: {
  token: FreshToken;
  copied: boolean;
  onCopy: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        marginBottom: 24,
        border: "1px solid #f3d894",
        background: "linear-gradient(180deg, #fff8e6 0%, #fefcf5 100%)",
        borderRadius: 12,
        padding: 20,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "linear-gradient(90deg, #d4a017, #8a5a00, #d4a017)",
        }}
      />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "#fef3c8",
            color: "#8a5a00",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="key" size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 18,
              color: "#5d3d00",
            }}
          >
            Copy this token now — you won&apos;t see it again.
          </div>
          <p style={{ fontSize: 13, color: "#8a5a00", margin: "4px 0 14px" }}>
            We store only a hash. If you lose the token, generate a new one.
          </p>
          <div
            style={{
              display: "flex",
              gap: 0,
              background: "#ffffff",
              borderRadius: 8,
              border: "1px solid #f3d894",
              overflow: "hidden",
            }}
          >
            <code
              style={{
                flex: 1,
                padding: "12px 14px",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--color-ink-800)",
                wordBreak: "break-all",
              }}
            >
              {token.value}
            </code>
            <button
              type="button"
              onClick={onCopy}
              className="btn"
              style={{
                borderRadius: 0,
                background: copied ? "var(--color-success-50)" : "#fef3c8",
                color: copied ? "var(--color-success-700)" : "#8a5a00",
                border: "none",
                borderLeft: "1px solid #f3d894",
                height: "auto",
              }}
            >
              <Icon name={copied ? "check" : "copy"} size={14} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onDismiss}
            style={{ marginTop: 12, color: "#8a5a00" }}
          >
            I&apos;ve saved it
          </button>
        </div>
      </div>
    </div>
  );
}
