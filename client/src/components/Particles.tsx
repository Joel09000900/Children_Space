import { useMemo } from "react";

/** Particules lumineuses flottantes (CSS uniquement) */
export default function Particles({ count = 28 }: { count?: number }) {
  const dots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        delay: Math.random() * -18,
        duration: 12 + Math.random() * 14,
        opacity: 0.25 + Math.random() * 0.5,
      })),
    [count],
  );
  return (
    <div className="particles" aria-hidden="true">
      {dots.map((d) => (
        <span
          key={d.id}
          style={{
            left: `${d.left}%`,
            width: d.size,
            height: d.size,
            opacity: d.opacity,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
