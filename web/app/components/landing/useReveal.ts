"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// useSyncExternalStore subscribe/snapshot for prefers-reduced-motion.
// getServerSnapshot always returns false → server and initial client render both
// see false, avoiding SSR hydration mismatch.
function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Scroll-reveal hook backed by IntersectionObserver.
 * Never uses window scroll listeners. Respects prefers-reduced-motion.
 */
export function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  // useSyncExternalStore avoids calling setState in an effect body and handles
  // SSR/hydration correctly via the getServerSnapshot returning false.
  const reduced = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduced) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  // When reduced is true, treat the element as always visible so consumers
  // skip their transition and show content immediately.
  return { ref, visible: reduced || visible, reduced };
}
