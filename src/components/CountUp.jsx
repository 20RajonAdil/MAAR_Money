import { useEffect, useRef, useState } from "react";

// Animates a GBP figure counting up to its value. Purposeful rather than
// decorative: it's the moment a person actually cares about — their money
// total landing — so it earns the motion.
export default function CountUp({ value, format, duration = 700 }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);
  const raf = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      prevValue.current = value;
      return;
    }
    const from = prevValue.current;
    const to = value;
    const start = performance.now();
    cancelAnimationFrame(raf.current);

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else prevValue.current = to;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <>{format(display)}</>;
}
