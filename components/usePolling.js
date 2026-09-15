"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Fetches a JSON endpoint now and again every `intervalMs`, pausing while the
// tab is hidden so an open dashboard doesn't burn hosting credits overnight.
export default function usePolling(url, intervalMs = 5000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    function schedule() {
      clearTimeout(timer.current);
      if (cancelled || document.hidden) return;
      timer.current = setTimeout(async () => {
        await load();
        schedule();
      }, intervalMs);
    }
    function onVisibility() {
      if (!document.hidden) {
        load();
        schedule();
      }
    }
    load();
    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load, intervalMs]);

  return { data, error, reload: load };
}
