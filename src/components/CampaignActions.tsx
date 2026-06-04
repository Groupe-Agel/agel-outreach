"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export function CampaignActions({
  id,
  status,
}: {
  id: string;
  status: string;
  scheduledAt: Date | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function testSend() {
    const res = await fetch(`/api/campaigns/${id}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json().catch(() => ({}));
    alert(res.ok ? "Test email sent to you." : data.error ?? "Failed");
  }

  function sendNow() {
    if (!confirm("Send this campaign now?")) return;
    start(async () => {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) alert(data.error ?? "Send failed");
      router.refresh();
    });
  }

  const canSend = status === "DRAFT" || status === "SCHEDULED";

  return (
    <>
      <button type="button" onClick={testSend} className="btn btn-secondary">
        <Icon name="send" size={14} /> Test send
      </button>
      {canSend && (
        <button
          type="button"
          onClick={sendNow}
          disabled={pending}
          className="btn btn-primary"
        >
          {pending ? "Sending…" : (
            <>
              <Icon name="send" size={14} /> Send now
            </>
          )}
        </button>
      )}
    </>
  );
}
