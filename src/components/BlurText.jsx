import { motion } from "motion/react";
import { useEffect, useRef, useState, useMemo } from "react";

// Adapted from a react-bits-style text reveal: splits text into words/letters
// and blurs each into place. Used sparingly — once per screen, on the
// heading that greets the person — rather than on every element.
const buildKeyframes = (from, steps) => {
  const keys = new Set([...Object.keys(from), ...steps.flatMap((s) => Object.keys(s))]);
  const keyframes = {};
  keys.forEach((k) => {
    keyframes[k] = [from[k], ...steps.map((s) => s[k])];
  });
  return keyframes;
};

export default function BlurText({
  text = "",
  delay = 60,
  className = "",
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "0px",
  animationFrom,
  animationTo,
  easing = (t) => t,
  onAnimationComplete,
  stepDuration = 0.3,
  as: Tag = "p",
  style,
}) {
  const elements = animateBy === "words" ? text.split(" ") : text.split("");
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(ref.current);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom = useMemo(
    () => (direction === "top" ? { filter: "blur(10px)", opacity: 0, y: -16 } : { filter: "blur(10px)", opacity: 0, y: 16 }),
    [direction]
  );
  const defaultTo = useMemo(
    () => [
      { filter: "blur(4px)", opacity: 0.6, y: direction === "top" ? 3 : -3 },
      { filter: "blur(0px)", opacity: 1, y: 0 },
    ],
    [direction]
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;
  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, i) => (stepCount === 1 ? 0 : i / (stepCount - 1)));

  return (
    <Tag ref={ref} className={className} style={{ display: "flex", flexWrap: "wrap", ...style }}>
      {elements.map((segment, index) => {
        const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);
        const spanTransition = { duration: totalDuration, times, delay: (index * delay) / 1000, ease: easing };
        return (
          <motion.span
            className="inline-block"
            key={index}
            style={{ willChange: "transform, filter, opacity", display: "inline-block" }}
            initial={fromSnapshot}
            animate={inView ? animateKeyframes : fromSnapshot}
            transition={spanTransition}
            onAnimationComplete={index === elements.length - 1 ? onAnimationComplete : undefined}
          >
            {segment === " " ? "\u00A0" : segment}
            {animateBy === "words" && index < elements.length - 1 && "\u00A0"}
          </motion.span>
        );
      })}
    </Tag>
  );
}
