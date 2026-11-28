import { useEffect, useState } from 'react';

/** Whole seconds remaining until `targetIso` (0 when passed or null). Ticks every second. */
export function useCountdown(targetIso: string | null | undefined) {
  const target = targetIso ? Date.parse(targetIso) : 0;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const tick = () => setNow(Date.now());
    const timer = setInterval(() => {
      tick();
      if (Date.now() >= target) clearInterval(timer);
    }, 1000);
    const first = setTimeout(tick, 0); // sync immediately when the target changes
    return () => {
      clearInterval(timer);
      clearTimeout(first);
    };
  }, [target]);

  return Math.max(0, Math.ceil((target - now) / 1000));
}

/** 75 → "1:15" */
export function formatSeconds(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
