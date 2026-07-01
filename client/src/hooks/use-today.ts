import { useEffect, useRef, useState } from "react";

function currentTodayStr(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function useToday(onRollover?: () => void): string {
  const [today, setToday] = useState<string>(currentTodayStr);
  const cbRef = useRef(onRollover);
  cbRef.current = onRollover;

  useEffect(() => {
    const tick = () => {
      const next = currentTodayStr();
      setToday((prev) => {
        if (prev === next) return prev;
        try {
          cbRef.current?.();
        } catch (err) {
          console.warn("[use-today] rollover callback failed", err);
        }
        return next;
      });
    };

    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return today;
}
