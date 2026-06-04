"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Wordmark } from "@/components/ui/Wordmark";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/StatusPill";

type NavUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "SUPERADMIN";
};

export function SideNav({
  user,
  devMode,
  campaignCount,
  templateCount,
  onSignOut,
}: {
  user: NavUser;
  devMode: boolean;
  campaignCount?: number;
  templateCount?: number;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const sections: Array<{
    title: string;
    items: Array<{ href: string; icon: IconName; label: string; badge?: number }>;
  }> = [
    {
      title: "Outreach",
      items: [
        { href: "/campaigns", icon: "paperPlane", label: "Campaigns", badge: campaignCount },
        { href: "/templates", icon: "folder", label: "Templates", badge: templateCount },
        { href: "/lists", icon: "users", label: "Lists" },
      ],
    },
    {
      title: "Settings",
      items: [
        { href: "/settings/profile", icon: "user", label: "Profile" },
        ...(user.role === "SUPERADMIN"
          ? [{ href: "/settings/users", icon: "users" as const, label: "Users" }]
          : []),
      ],
    },
  ];

  const isActive = (href: string) =>
    pathname === href ||
    pathname.startsWith(href + "/") ||
    (href === "/campaigns" && pathname.startsWith("/campaigns"));

  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 248,
        padding: "20px 14px",
        background: "#ffffff",
        borderRight: "1px solid var(--color-ink-100)",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
      }}
    >
      {/* Brand */}
      <Link
        href="/campaigns"
        style={{
          display: "flex",
          alignItems: "center",
          padding: "4px 8px 18px 8px",
          borderBottom: "1px solid var(--color-ink-100)",
        }}
      >
        <Wordmark size={16} />
      </Link>

      {/* Compose CTA */}
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => router.push("/campaigns/new")}
        style={{ marginTop: 16, justifyContent: "space-between" }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="plus" size={14} strokeWidth={2} /> New campaign
        </span>
        <span
          className="mono"
          style={{
            fontSize: 10,
            padding: "1px 5px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 3,
            letterSpacing: "0.04em",
          }}
        >
          ⌘N
        </span>
      </button>

      {/* Search (visual stub for now) */}
      <div style={{ position: "relative", marginTop: 12 }}>
        <span
          style={{
            position: "absolute",
            left: 11,
            top: 11,
            color: "var(--color-ink-400)",
            pointerEvents: "none",
          }}
        >
          <Icon name="search" size={13} />
        </span>
        <input
          className="input"
          placeholder="Search…"
          style={{ paddingLeft: 32, height: 34, fontSize: 13 }}
        />
        <span
          className="mono"
          style={{
            position: "absolute",
            right: 8,
            top: 8,
            fontSize: 10,
            padding: "2px 5px",
            background: "var(--color-ink-50)",
            borderRadius: 3,
            color: "var(--color-ink-400)",
            pointerEvents: "none",
          }}
        >
          ⌘K
        </span>
      </div>

      {/* Nav */}
      <nav style={{ marginTop: 20, flex: 1, overflowY: "auto" }}>
        {sections.map((s) => (
          <div key={s.title} style={{ marginBottom: 18 }}>
            <div className="eyebrow" style={{ padding: "0 10px 8px", fontSize: 10 }}>
              {s.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {s.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  badge={item.badge}
                  active={isActive(item.href)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <UserCard user={user} devMode={devMode} onSignOut={onSignOut} />
    </aside>
  );
}

function NavItem({
  href,
  icon,
  label,
  badge,
  active,
}: {
  href: string;
  icon: IconName;
  label: string;
  badge?: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 10px",
        borderRadius: 6,
        fontSize: 13.5,
        fontWeight: active ? 500 : 400,
        color: active ? "var(--color-maroon-700)" : "var(--color-ink-700)",
        background: active ? "var(--color-blush-50)" : "transparent",
        transition: "all 80ms",
        position: "relative",
      }}
    >
      {active && (
        <span
          style={{
            position: "absolute",
            left: -14,
            top: 6,
            bottom: 6,
            width: 2,
            background: "var(--color-maroon-700)",
          }}
        />
      )}
      <Icon
        name={icon}
        size={15}
        strokeWidth={active ? 2 : 1.6}
        style={active ? undefined : { color: "var(--color-ink-400)" }}
      />
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && (
        <span
          className="mono"
          style={{
            fontSize: 10.5,
            padding: "1px 6px",
            background: active ? "var(--color-blush-100)" : "var(--color-ink-50)",
            color: active ? "var(--color-maroon-700)" : "var(--color-ink-400)",
            borderRadius: 4,
            letterSpacing: "0.02em",
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

function UserCard({
  user,
  devMode,
  onSignOut,
}: {
  user: NavUser;
  devMode: boolean;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderTop: "1px solid var(--color-ink-100)",
        paddingTop: 12,
        marginTop: 12,
        position: "relative",
      }}
    >
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 20 }}
          />
          <div
            className="card"
            style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              right: 0,
              marginBottom: 6,
              padding: 6,
              boxShadow: "var(--shadow-lg)",
              zIndex: 21,
            }}
          >
            <Link href="/settings/profile" className="menu-item" onClick={() => setOpen(false)}>
              <Icon name="user" size={14} /> View profile
            </Link>
            <div style={{ height: 1, background: "var(--color-ink-100)", margin: "4px -2px" }} />
            <button
              type="button"
              className="menu-item"
              style={{ width: "100%", textAlign: "left", border: "none", background: "transparent" }}
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
            >
              <Icon name="logout" size={14} /> Sign out
            </button>
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "8px 8px",
          background: open ? "var(--color-blush-50)" : "transparent",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          transition: "background 100ms",
        }}
      >
        <Avatar name={user.name} email={user.email} size={32} />
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-ink-800)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.name ?? user.email}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--color-ink-400)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <RoleBadge role={user.role} />
            {devMode && <span className="badge badge-dev">dev</span>}
          </div>
        </div>
        <Icon name="chevronUpDown" size={14} style={{ color: "var(--color-ink-400)" }} />
      </button>
      <style>{`
        .menu-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 4px;
          font-size: 13px; color: var(--color-ink-700); cursor: pointer;
        }
        .menu-item:hover { background: var(--color-blush-50); color: var(--color-maroon-700); }
      `}</style>
    </div>
  );
}
