import { useCallback, useEffect, useState } from "react";
import { hasSeen, markSeen } from "./seen";

export type PayState = { status: "idle" | "checking" | "ok" | "fail"; text: string };

function stripRef() {
  try { const p = new URLSearchParams(location.search); p.delete("ref"); const qs = p.toString(); history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash); } catch {}
}

/** Confirms a Paystack payment when the page is opened with ?ref=... Pressing OK on the success popup removes the ref, so it never shows again. */
export function usePayRef(onConfirmed?: () => void) {
  const [s, setS] = useState<PayState>({ status: "idle", text: "" }); const [ref, setRef] = useState("");
  useEffect(() => {
    const r = new URLSearchParams(location.search).get("ref"); if (!r) return;
    if (hasSeen("pay:" + r)) { stripRef(); return; }
    setRef(r); setS({ status: "checking", text: "Confirming your payment, hang tight…" });
    fetch("/api/verify?ref=" + encodeURIComponent(r)).then(x => x.json()).then(d => {
      if (d.confirmed) { setS({ status: "ok", text: "Payment confirmed. Thank you, your votes are in!" }); onConfirmed?.(); }
      else setS({ status: "fail", text: "We couldn’t confirm your payment yet. If you were charged, your votes will show up shortly. Try refreshing in a minute." });
    }).catch(() => setS({ status: "fail", text: "We couldn’t reach the server to confirm your payment. Please refresh in a minute." }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const dismiss = useCallback(() => {
    if (s.status === "ok") { markSeen("pay:" + ref); stripRef(); }
    setS({ status: "idle", text: "" });
  }, [s.status, ref]);
  return { ...s, dismiss };
}
