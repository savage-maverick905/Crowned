"use client";
import { useEffect, useState } from "react";
import Popup from "./Popup";
import RichHtml from "./RichHtml";
import { hasSeen, markSeen } from "@/lib/seen";

type N = { id: string; rev: number; title?: string; text?: string; html?: string; css?: string };

/** Live notices from the admin, shown one at a time. Each shows once per browser until the admin edits or resends it. */
export default function NoticePopups({ hold = false }: { hold?: boolean }) {
  const [queue, setQueue] = useState<N[]>([]);
  useEffect(() => {
    fetch("/api/notices").then(r => r.json()).then(d => setQueue(((d.notices || []) as N[]).filter(n => !hasSeen(`n:${n.id}:${n.rev}`)))).catch(() => {});
  }, []);
  const cur = queue[0];
  const ok = () => { if (!cur) return; markSeen(`n:${cur.id}:${cur.rev}`); setQueue(q => q.slice(1)); };
  return (
    <Popup open={!!cur && !hold} title={cur?.title || "Notice"} onOk={ok}>
      {cur && (cur.html ? <RichHtml html={cur.html} css={cur.css} /> : <p className="whitespace-pre-line text-mute">{cur.text}</p>)}
    </Popup>
  );
}
