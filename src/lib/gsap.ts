"use client";

import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins once
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ─── Configuration Constants ─── */
const INTERACTION_DURATION = 0.25; // < 300ms
const PAGE_DURATION = 0.5;        // < 600ms
const STAGGER_AMOUNT = 0.08;

/* ─── useGSAP — run a GSAP callback on mount with automatic cleanup ─── */
export function useGSAP(
  callback: (ctx: gsap.Context) => void,
  deps: React.DependencyList = []
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => callback(gsap.context(() => {}, ref)), ref);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/* ─── Fade-up entrance for a single element ─── */
export function useFadeUp(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    gsap.fromTo(
      el,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: PAGE_DURATION, delay, ease: "power2.out" }
    );
  }, [delay]);

  return ref;
}

/* ─── Stagger children entrance (fade-up) ─── */
export function useStaggerIn(triggerOnScroll = false) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const children = ref.current.children;
    if (!children.length) return;

    const config: gsap.TweenVars = {
      opacity: 1,
      y: 0,
      duration: PAGE_DURATION,
      stagger: STAGGER_AMOUNT,
      ease: "power2.out",
    };

    if (triggerOnScroll) {
      (config as any).scrollTrigger = {
        trigger: ref.current,
        start: "top 85%",
        once: true,
      };
    }

    gsap.set(children, { opacity: 0, y: 24 });
    gsap.to(children, config);

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === ref.current) t.kill();
      });
    };
  }, [triggerOnScroll]);

  return ref;
}

/* ─── Count-up animation for metric numbers ─── */
export function useCountUp(endValue: number, duration = 1.2, startOnMount = true) {
  const ref = useRef<HTMLSpanElement>(null);
  const hasRun = useRef(false);

  const animate = useCallback(() => {
    if (!ref.current || hasRun.current) return;
    hasRun.current = true;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: endValue,
      duration,
      ease: "power1.out",
      onUpdate() {
        if (ref.current) {
          ref.current.textContent =
            endValue >= 1000
              ? Math.round(obj.val).toLocaleString()
              : endValue % 1 !== 0
                ? obj.val.toFixed(1)
                : String(Math.round(obj.val));
        }
      },
    });
  }, [endValue, duration]);

  useEffect(() => {
    if (startOnMount) animate();
  }, [startOnMount, animate]);

  return { ref, animate };
}

/* ─── Scale-in for modals / dialogs ─── */
export function animateModalIn(el: HTMLElement) {
  gsap.fromTo(
    el,
    { opacity: 0, scale: 0.92, y: 16 },
    { opacity: 1, scale: 1, y: 0, duration: INTERACTION_DURATION, ease: "back.out(1.4)" }
  );
}

export function animateModalOut(el: HTMLElement, onComplete?: () => void) {
  gsap.to(el, {
    opacity: 0,
    scale: 0.94,
    y: 10,
    duration: 0.2,
    ease: "power2.in",
    onComplete,
  });
}

/* ─── Backdrop fade ─── */
export function animateBackdropIn(el: HTMLElement) {
  gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 });
}

export function animateBackdropOut(el: HTMLElement, onComplete?: () => void) {
  gsap.to(el, { opacity: 0, duration: 0.18, onComplete });
}

/* ─── Button press effect ─── */
export function animateButtonPress(el: HTMLElement) {
  gsap.fromTo(
    el,
    { scale: 1 },
    { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1, ease: "power2.inOut" }
  );
}

/* ─── Toast slide-in ─── */
export function animateToastIn(el: HTMLElement) {
  gsap.fromTo(
    el,
    { opacity: 0, x: 80, scale: 0.9 },
    { opacity: 1, x: 0, scale: 1, duration: INTERACTION_DURATION, ease: "back.out(1.2)" }
  );
}

/* ─── Pulse animation (for badges, critical states) ─── */
export function usePulse() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    tl.to(ref.current, { scale: 1.12, duration: 0.6, ease: "sine.inOut" });
    return () => { tl.kill(); };
  }, []);

  return ref;
}

/* ─── Hero timeline (heading, subtext, search bar stagger) ─── */
export function useHeroTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const heading = containerRef.current.querySelector("[data-gsap='hero-heading']");
    const subtext = containerRef.current.querySelector("[data-gsap='hero-subtext']");
    const searchBar = containerRef.current.querySelector("[data-gsap='hero-search']");
    const categories = containerRef.current.querySelectorAll("[data-gsap='hero-cat']");

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    if (heading) {
      tl.fromTo(heading, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6 });
    }
    if (subtext) {
      tl.fromTo(subtext, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 }, "-=0.3");
    }
    if (searchBar) {
      tl.fromTo(searchBar, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 }, "-=0.2");
    }
    if (categories.length) {
      tl.fromTo(
        categories,
        { opacity: 0, y: 16, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, stagger: 0.06 },
        "-=0.15"
      );
    }

    return () => { tl.kill(); };
  }, []);

  return containerRef;
}

/* ─── Scroll-triggered fade-up for sections ─── */
export function useScrollFadeUp() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: PAGE_DURATION,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 88%",
          once: true,
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === ref.current) t.kill();
      });
    };
  }, []);

  return ref;
}

/* ─── Sidebar active item highlight transition ─── */
export function animateSidebarHighlight(el: HTMLElement) {
  gsap.fromTo(
    el,
    { backgroundColor: "rgba(59,130,246,0)", x: -4 },
    { backgroundColor: "rgba(59,130,246,0.08)", x: 0, duration: INTERACTION_DURATION, ease: "power2.out" }
  );
}

/* ─── Table rows stagger ─── */
export function animateTableRows(container: HTMLElement) {
  const rows = container.querySelectorAll("tr");
  if (!rows.length) return;
  gsap.fromTo(
    rows,
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: "power2.out" }
  );
}

export { gsap, ScrollTrigger, INTERACTION_DURATION, PAGE_DURATION, STAGGER_AMOUNT };
