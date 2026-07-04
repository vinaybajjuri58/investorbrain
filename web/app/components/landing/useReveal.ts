"use client";

import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Scroll-reveal hook backed by IntersectionObserver.
 * Never uses window scroll listeners. Respects prefers-reduced-motion.
 */
export function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [reduced] = useState(prefersReducedMotion);
  const [visible, setVisible] = useState(reduced);

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

  return { ref, visible, reduced };
}
