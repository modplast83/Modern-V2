import { useEffect, useRef } from "react";

import { useToast } from "./use-toast";

/**
 * Anti-fraud watchdog for page abandonment.
 *
 * Wire protocol (server is authoritative):
 *   POST /api/attendance/:id/withdraw  body: { action: 'start' | 'end' }
 *
 * Strategy
 *   - On visibilitychange→hidden / pagehide: OPEN a withdrawal interval
 *     **immediately**. Background tabs throttle setTimeout heavily on
 *     mobile and some desktop browsers, so a delayed "after Xs hidden"
 *     start would be unreliable (the user could come back before the
 *     timer ever fires and the absence would never be recorded).
 *   - We intentionally do NOT listen to window `blur`/`focus`. Those
 *     fire whenever the window loses focus for any reason — clicking
 *     into devtools, switching to another iframe in the page,
 *     interacting with the Replit preview chrome, etc. — and that
 *     produced spurious withdrawals right after login. The Page
 *     Visibility API is the canonical "user actually left this tab"
 *     signal.
 *   - On visible / pageshow: CLOSE the open interval. The server
 *     computes the duration from the row's `started_at` and only
 *     subtracts time when the gap is >= 1 minute (`MIN_DEDUCTIBLE_MINUTES`
 *     in the route). Sub-minute flickers close the row at 0 minutes.
 *   - A localStorage heartbeat (15s) lets the watchdog detect a full
 *     reload/crash on next mount and close the dangling row.
 */

const HEARTBEAT_KEY = "attendance_watchdog_heartbeat";
const HEARTBEAT_INTERVAL_MS = 15_000;

interface UseAttendanceWatchdogParams {
  enabled: boolean;
  attendanceId: number | null | undefined;
  userId: number | null | undefined;
  onWithdrawalChanged?: () => void;
}

export function useAttendanceWatchdog({
  enabled,
  attendanceId,
  userId,
  onWithdrawalChanged,
}: UseAttendanceWatchdogParams) {
  const { toast } = useToast();
  const isOpenRef = useRef(false);
  const inFlightRef = useRef<Promise<unknown> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !attendanceId || !userId) return;

    const heartbeatKey = `${HEARTBEAT_KEY}_${userId}_${attendanceId}`;

    const callAction = async (
      action: "start" | "end",
    ): Promise<Response | null> => {
      try {
        const res = await fetch(`/api/attendance/${attendanceId}/withdraw`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action, reason: "page_abandonment" }),
          // keepalive lets the request survive a page unload — critical
          // for closing the row when the user navigates away or closes the
          // tab. Most browsers cap the body at 64KB; ours is tiny.
          keepalive: true,
        });
        if (res.ok) onWithdrawalChanged?.();
        return res;
      } catch (err) {
        console.warn("[attendance-watchdog] action failed", action, err);
        return null;
      }
    };

    // Serialize start/end so a rapid visibility flip can't interleave.
    const enqueue = async (fn: () => Promise<unknown>) => {
      const prev = inFlightRef.current ?? Promise.resolve();
      const next = prev.then(fn, fn);
      inFlightRef.current = next;
      try {
        await next;
      } finally {
        if (inFlightRef.current === next) inFlightRef.current = null;
      }
    };

    const startWithdrawal = () =>
      enqueue(async () => {
        if (isOpenRef.current) return;
        isOpenRef.current = true;
        const res = await callAction("start");
        // 409 means server refused (e.g. user is on break) — back out so
        // we don't try to close a non-existent row on return.
        if (res && (res.status === 409 || res.status === 400)) {
          isOpenRef.current = false;
        }
      });

    const endWithdrawal = (showToast: boolean) =>
      enqueue(async () => {
        if (!isOpenRef.current) return;
        isOpenRef.current = false;
        const res = await callAction("end");
        if (showToast && res?.ok) {
          try {
            const data = (await res.clone().json()) as {
              durationMinutes?: number;
            };
            if (data?.durationMinutes && data.durationMinutes > 0) {
              toast({
                title: "⚠️",
                description:
                  "تم رصد مغادرتك للصفحة، تم خصم الوقت تلقائياً • Page abandonment detected, time deducted",
                variant: "destructive",
              });
            }
          } catch {}
        }
      });

    // Reload/crash recovery: if the last heartbeat is stale, the previous
    // session likely had an open row that never closed. Mark ourselves as
    // "open" so the next end call closes it server-side.
    try {
      const prev = localStorage.getItem(heartbeatKey);
      if (prev) {
        const prevTime = parseInt(prev, 10);
        if (!Number.isNaN(prevTime)) {
          const gap = Date.now() - prevTime;
          if (gap >= HEARTBEAT_INTERVAL_MS * 2) {
            isOpenRef.current = true;
            void endWithdrawal(true);
          }
        }
      }
    } catch {}

    const writeHeartbeat = () => {
      try {
        localStorage.setItem(heartbeatKey, String(Date.now()));
      } catch {}
    };
    writeHeartbeat();
    heartbeatTimerRef.current = setInterval(
      writeHeartbeat,
      HEARTBEAT_INTERVAL_MS,
    );

    const onHide = () => {
      // Open the interval *now* — do not wait. Background-tab timer
      // throttling on mobile and modern desktop browsers would otherwise
      // swallow the start request entirely.
      void startWithdrawal();
    };
    const onShow = () => {
      writeHeartbeat();
      void endWithdrawal(true);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHide();
      else onShow();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onShow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onShow);
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      try {
        localStorage.removeItem(heartbeatKey);
      } catch {}
    };
  }, [enabled, attendanceId, userId, toast, onWithdrawalChanged]);
}
