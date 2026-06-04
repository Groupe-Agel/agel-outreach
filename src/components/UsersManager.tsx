"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/StatusPill";

type Role = "USER" | "SUPERADMIN";

type Row = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: string;
  hasPassword: boolean;
};

type ModalState =
  | { type: "create" }
  | { type: "edit"; user: Row }
  | { type: "delete"; user: Row }
  | null;

export function UsersManager({
  initial,
  currentUserId,
}: {
  initial: Row[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [modal, setModal] = useState<ModalState>(null);
  const [pending, start] = useTransition();

  async function refresh() {
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = (await res.json()) as { users: Row[] };
      setRows(data.users);
    }
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setModal({ type: "create" })}
        >
          <Icon name="plus" size={14} /> New user
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 2fr 1fr 1fr 90px",
            gap: 16,
            padding: "10px 20px",
            background: "var(--color-ink-25)",
            borderBottom: "1px solid var(--color-ink-100)",
            fontSize: 11,
            fontWeight: 500,
            color: "var(--color-ink-400)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontFamily: "var(--font-mono)",
          }}
        >
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Created</span>
          <span />
        </div>

        {rows.map((u, i) => (
          <div
            key={u.id}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 2fr 1fr 1fr 90px",
              gap: 16,
              padding: "14px 20px",
              alignItems: "center",
              borderTop: i > 0 ? "1px solid var(--color-ink-50)" : "none",
              background:
                u.id === currentUserId ? "var(--color-blush-50)" : "transparent",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar name={u.name} email={u.email} size={28} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                  {u.name ?? u.email.split("@")[0]}
                  {u.id === currentUserId && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 11,
                        color: "var(--color-ink-400)",
                      }}
                    >
                      (you)
                    </span>
                  )}
                </div>
                {!u.hasPassword && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: "var(--color-warning-700)",
                      marginTop: 2,
                    }}
                  >
                    <Icon name="alert" size={10} /> no password set
                  </div>
                )}
              </div>
            </div>
            <span className="mono" style={{ fontSize: 12.5, color: "var(--color-ink-600)" }}>
              {u.email}
            </span>
            <span>
              <RoleBadge role={u.role} />
            </span>
            <span className="mono" style={{ fontSize: 12, color: "var(--color-ink-400)" }}>
              {new Date(u.createdAt).toLocaleDateString()}
            </span>
            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: "0 8px" }}
                onClick={() => setModal({ type: "edit", user: u })}
              >
                <Icon name="edit" size={13} />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{
                  padding: "0 8px",
                  color: u.id === currentUserId
                    ? "var(--color-ink-200)"
                    : "var(--color-danger-700)",
                }}
                disabled={u.id === currentUserId}
                onClick={() =>
                  u.id !== currentUserId && setModal({ type: "delete", user: u })
                }
              >
                <Icon name="trash" size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <UserModal
          modal={modal}
          pending={pending}
          onClose={() => setModal(null)}
          onCreate={(payload) =>
            start(async () => {
              const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                alert(data.error ?? "Create failed");
                return;
              }
              setModal(null);
              await refresh();
            })
          }
          onEdit={(id, payload) =>
            start(async () => {
              const res = await fetch(`/api/users/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                alert(data.error ?? "Update failed");
                return;
              }
              setModal(null);
              await refresh();
            })
          }
          onDelete={(id) =>
            start(async () => {
              const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                alert(data.error ?? "Delete failed");
                return;
              }
              setModal(null);
              await refresh();
            })
          }
        />
      )}
    </div>
  );
}

function UserModal({
  modal,
  pending,
  onClose,
  onCreate,
  onEdit,
  onDelete,
}: {
  modal: NonNullable<ModalState>;
  pending: boolean;
  onClose: () => void;
  onCreate: (payload: {
    email: string;
    name?: string;
    password: string;
    role: Role;
  }) => void;
  onEdit: (
    id: string,
    payload: { name?: string; role?: Role; password?: string },
  ) => void;
  onDelete: (id: string) => void;
}) {
  const u = "user" in modal ? modal.user : null;
  const [name, setName] = useState(u?.name ?? "");
  const [email, setEmail] = useState(u?.email ?? "");
  const [role, setRole] = useState<Role>(u?.role ?? "USER");
  const [password, setPassword] = useState("");
  const [confirmDel, setConfirmDel] = useState("");

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(25,25,25,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "fadeIn 200ms ease",
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460,
          padding: 0,
          boxShadow: "var(--shadow-takeover)",
          overflow: "hidden",
          animation: "slideUp 240ms cubic-bezier(.2,.9,.3,1)",
        }}
      >
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--color-ink-100)" }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            {modal.type === "create"
              ? "New user"
              : modal.type === "edit"
                ? "Edit user"
                : "Delete user"}
          </div>
          <h3
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 22,
              margin: 0,
              letterSpacing: "-0.02em",
              fontWeight: 400,
            }}
          >
            {modal.type === "create"
              ? "Invite a team member"
              : modal.type === "edit"
                ? u?.name ?? u?.email
                : `Remove ${u?.name ?? u?.email}?`}
          </h3>
        </div>

        <div style={{ padding: "20px 22px" }}>
          {modal.type === "delete" && u ? (
            <>
              <p
                style={{
                  fontSize: 13.5,
                  color: "var(--color-ink-600)",
                  margin: "0 0 16px",
                }}
              >
                This will revoke access immediately and delete{" "}
                <span className="mono" style={{ color: "var(--color-ink-800)" }}>
                  {u.email}
                </span>
                &rsquo;s account. Their campaigns and templates will be preserved.
              </p>
              <label className="label">
                Type <span className="mono">DELETE</span> to confirm
              </label>
              <input
                className="input mono"
                value={confirmDel}
                onChange={(e) => setConfirmDel(e.target.value)}
              />
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label">Full name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input mono"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={modal.type === "edit"}
                  style={{ fontSize: 13 }}
                />
              </div>
              <div>
                <label className="label">Role</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(["USER", "SUPERADMIN"] as Role[]).map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRole(r)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: `1.5px solid ${role === r ? "var(--color-maroon-700)" : "var(--color-ink-100)"}`,
                        background: role === r ? "var(--color-blush-50)" : "#ffffff",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ marginBottom: 4 }}>
                        <RoleBadge role={r} />
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--color-ink-600)" }}>
                        {r === "USER"
                          ? "Create templates, run campaigns, manage own tokens."
                          : "Everything USER can do + manage users."}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">
                  {modal.type === "create"
                    ? "Temporary password (min 8 chars)"
                    : "New password (leave blank to keep current)"}
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    className="input mono"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={modal.type === "create" ? "Set or auto-generate" : ""}
                    style={{ fontSize: 13 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      setPassword(
                        Math.random().toString(36).slice(2, 10) +
                          Math.random().toString(36).slice(2, 6),
                      )
                    }
                  >
                    <Icon name="refresh" size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: "14px 22px",
            background: "var(--color-ink-25)",
            borderTop: "1px solid var(--color-ink-100)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {modal.type === "delete" && u ? (
            <button
              type="button"
              className="btn btn-danger"
              disabled={confirmDel !== "DELETE" || pending}
              onClick={() => onDelete(u.id)}
              style={{
                background:
                  confirmDel === "DELETE" ? "var(--color-danger-700)" : "var(--color-danger-50)",
                color: confirmDel === "DELETE" ? "#fff" : "var(--color-danger-700)",
                borderColor:
                  confirmDel === "DELETE" ? "var(--color-danger-700)" : "#f3c5c0",
              }}
            >
              <Icon name="trash" size={14} /> Remove user
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending || !name || !email || (modal.type === "create" && !password)}
              onClick={() => {
                if (modal.type === "create") {
                  onCreate({ email, name, password, role });
                } else if (modal.type === "edit" && u) {
                  const payload: { name?: string; role?: Role; password?: string } = {};
                  if (name !== (u.name ?? "")) payload.name = name;
                  if (role !== u.role) payload.role = role;
                  if (password) payload.password = password;
                  if (Object.keys(payload).length === 0) {
                    onClose();
                    return;
                  }
                  onEdit(u.id, payload);
                }
              }}
            >
              {pending
                ? "Working…"
                : modal.type === "create"
                  ? "Create user"
                  : "Save changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
