import { useEffect, useRef } from "react";

import { useToast } from "./use-toast";

/**
 * Anti-fraud watchdog that detects page abandonment (tab hidden, window
 * blurred, navigation away) and reports a withdrawal period to the server
 * so the user's daily working time is deducted accordingly.
 *
 * - Active only when `enabled` is true (i.e. user is checked-in & working).
 * - A "heartbeat" key in localStorage covers full page reloads / crashes:
 *   on mount, if the previous heartbeat is older than `thresholdMs`, that
 *   gap is reported as a withdrawal.
 * - When document goes hidden / window blurs, a timer starts. If it stays
 *   hidden for at least `thresholdMs`, a withdrawal is recorded with the
 *   abandonment duration. When the page becomes visible again the watchdog
 *   finalizes the period and shows a resume toast.
 */

const HEARTBEAT_KEY = "attendance_watchdog_heartbeat";
const HEARTBEAT_INTERVAL_MS = 15_000;
const DEFAULT_THRESHOLD_MS = 30_000;

interface UseAttendanceWatchdogParams {
  enabled: boolean;
  attendanceId: number | null | undefined;
  userId: number | null | undefined;
  thresholdMs?: number;
  onWithdrawalRecorded?: (durationMinutes: number) => void;
}

export function useAttendanceWatchdog({
  enabled,
  attendanceId,
  userId,
  thresholdMs = DEFAULT_THRESHOLD_MS,
  onWithdrawalRecorded,
}: UseAttendanceWatchdogParams) {
  const { toast } = useToast();
  const hiddenSinceRef = useRef<number | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isReportingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !attendanceId || !userId) {
      // Clean any stale heartbeat for this session
      try {
        localStorage.removeItem(HEARTBEAT_KEY);
      } catch {}
      return;
    }

    const heartbeatKey = `${HEARTBEAT_KEY}_${userId}_${attendanceId}`;

    const reportWithdrawal = async (
      startedAt: Date,
      endedAt: Date,
      reason: string,
    ) => {
      const durationMs = endedAt.getTime() - startedAt.getTime();
      const durationMinutes = Math.max(0, Math.round(durationMs / 60_000));
      if (durationMinutes <= 0 || isReportingRef.current) return;
      isReportingRef.current = true;
      try {
        const res = await fetch(`/api/attendance/${attendanceId}/withdraw`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            started_at: startedAt.toISOString(),
            ended_at: endedAt.toISOString(),
            duration_minutes: durationMinutes,
            reason,
          }),
        });
        if (res.ok) {
          onWithdrawalRecorded?.(durationMinutes);
        }
      } catch (err) {
        console.warn("[attendance-watchdog] failed to report withdrawal", err);
      } finally {
        isReportingRef.current = false;
      }
    };

    // Recover from previous reload/crash gap
    try {
      const prev = localStorage.getItem(heartbeatKey);
      if (prev) {
        const prevTime = parseInt(prev, 10);
        if (!Number.isNaN(prevTime)) {
          const gap = Date.now() - prevTime;
          if (gap >= thresholdMs) {
            void reportWithdrawal(
              new Date(prevTime),
              new Date(),
              "page_abandonment",
            );
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

    const handleHidden = () => {
      if (hiddenSinceRef.current === null) {
        hiddenSinceRef.current = Date.now();
      }
    };

    const handleVisible = () => {
      if (hiddenSinceRef.current !== null) {
        const startedAt = new Date(hiddenSinceRef.current);
        const endedAt = new Date();
        const gap = endedAt.getTime() - startedAt.getTime();
        hiddenSinceRef.current = null;
        writeHeartbeat();
        if (gap >= thresholdMs) {
          void reportWithdrawal(startedAt, endedAt, "page_abandonment");
          toast({
            title: "⚠️",
            description:
              "تم رصد مغادرتك للصفحة، تم خصم الوقت تلقائياً • Page abandonment detected, time deducted",
            variant: "destructive",
          });
        }
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") handleHidden();
      else handleVisible();
    };
    const onBlur = () => handleHidden();
    const onFocus = () => handleVisible();
    const onPageHide = () => handleHidden();
    const onPageShow = () => handleVisible();
    const onBeforeUnload = () => {
      // Best-effort: flag the moment of unload so the heartbeat-recovery
      // path will pick it up on the next mount.
      try {
        localStorage.setItem(heartbeatKey, String(Date.now()));
      } catch {}
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      hiddenSinceRef.current = null;
    };
  }, [enabled, attendanceId, userId, thresholdMs, toast, onWithdrawalRecorded]);
}
