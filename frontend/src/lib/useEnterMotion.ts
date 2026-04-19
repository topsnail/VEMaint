import { useLayoutEffect } from "react";
import gsap from "gsap";

export function useEnterMotion(target: React.RefObject<HTMLElement>, deps: unknown[] = []) {
  useLayoutEffect(() => {
    const el = target.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 10, filter: "blur(4px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.28, ease: "power2.out" },
      );
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

