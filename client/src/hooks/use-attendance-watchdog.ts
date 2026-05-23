import { useEffect, useRef } from "react";

import { useToast } from "./use-toast";

/**
 * Anti-fraud watchdog that detects page abandonment (tab hidden, window
 * blurred, navigation away) and notifies the server so it can:
 *   1. switch the attendance row to "منسحب" while the user is away
 *   2. deduct the elapsed minutes from the daily working time
 *   3. restore the previous status when the user returns
 *
 * Wire protocol (server-authoritative timestamps):
 *   POST /api/attendance/:id/withdraw  body: { action: 'start' | 'end' }
 *
 * - Active only when `enabled` is true (user is checked-in & working).
 * - When the page goes hidden/blurred for at least `thresholdMs`, the
 *   watchdog calls `action: 'start'`. When the user returns, it calls
 *   `action: 'end'`.
 * - A `localStorage` heartbeat (15s) lets the watchdog detect full
 *   page reloads / crashes on next mount and reconcile the open period.
 */

const HEARTBEAT_KEY = "attendance_watchdog_heartbeat";
const HEARTBEAT_INTERVAL_MS = 15_000;
const DEFAULT_THRESHOLD_MS = 30_000;

interface UseAttendanceWatchdogParams {
  enabled: boolean;
  attendanceId: number | null | undefined;
  userId: number | null | undefined;
  thresholdMs?: number;
  onWithdrawalChanged?: () => void;
}

export function useAttendanceWatchdog({
  enabled,
  attendanceId,
  userId,
  thresholdMs = DEFAULT_THRESHOLD_MS,
  onWithdrawalChanged,
}: UseAttendanceWatchdogParams) {
  const { toast } = useToast();
  const hiddenSinceRef = useRef<number | null>(null);
  const isOpenRef = useRef(false);
  const pendingStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !attendanceId || !userId) {
      try {
        localStorage.removeItem(HEARTBEAT_KEY);
      } catch {}
      return;
    }

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
        });
        if (res.ok) onWithdrawalChanged?.();
        return res;
      } catch (err) {
        console.warn("[attendance-watchdog] action failed", action, err);
        return null;
      }
    };

    const startWithdrawal = async () => {
      if (isOpenRef.current) return;
      isOpenRef.current = true;
      await callAction("start");
    };

    const endWithdrawal = async (showToast: boolean) => {
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
    };

    // Recover from previous reload/crash gap: if the last heartbeat is
    // older than the threshold, assume the user was away and close any
    // open server-side withdrawal that may still be hanging.
    try {
      const prev = localStorage.getItem(heartbeatKey);
      if (prev) {
        const prevTime = parseInt(prev, 10);
        if (!Number.isNaN(prevTime)) {
          const gap = Date.now() - prevTime;
          if (gap >= thresholdMs) {
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

    const clearPendingStart = () => {
      if (pendingStartTimerRef.current) {
        clearTimeout(pendingStartTimerRef.current);
        pendingStartTimerRef.current = null;
      }
    };

    const handleHidden = () => {
      if (hiddenSinceRef.current !== null) return;
      hiddenSinceRef.current = Date.now();
      // Only open a withdrawal AFTER the threshold has actually elapsed,
      // so brief focus changes don't create noise rows.
      clearPendingStart();
      pendingStartTimerRef.current = setTimeout(() => {
        if (hiddenSinceRef.current !== null) void startWithdrawal();
      }, thresholdMs);
    };

    const handleVisible = () => {
      const since = hiddenSinceRef.current;
      hiddenSinceRef.current = null;
      clearPendingStart();
      writeHeartbeat();
      if (since !== null && Date.now() - since >= thresholdMs) {
        void endWithdrawal(true);
      } else if (isOpenRef.current) {
        // Edge case: open already (from heartbeat recovery) but no hidden gap.
        void endWithdrawal(false);
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
      clearPendingStart();
      hiddenSinceRef.current = null;
    };
  }, [enabled, attendanceId, userId, thresholdMs, toast, onWithdrawalChanged]);
}
