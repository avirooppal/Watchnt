import { useCallback, useEffect, useRef, useState } from "react";
export function useEngineStatus() {
  const [online, setOnline] = useState<boolean | null>(null);
  const current = useRef<AbortController | null>(null);
  const check = useCallback(async () => {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch("http://localhost:8000/health", {
        signal: controller.signal,
      });
      if (current.current === controller) setOnline(response.ok);
    } catch {
      if (current.current === controller) setOnline(false);
    } finally {
      clearTimeout(timer);
    }
  }, []);
  useEffect(() => {
    void check();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 15000);
    return () => {
      clearInterval(timer);
      const controller = current.current;
      current.current = null;
      controller?.abort();
    };
  }, [check]);
  return { online, check };
}
