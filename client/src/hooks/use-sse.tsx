// @refresh reset
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./use-auth";

// SSE event types
export interface SSENotification {
  id: number;
  title: string;
  title_ar?: string;
  message: string;
  message_ar?: string;
  type: string;
  priority: "low" | "normal" | "high" | "urgent";
  context_type?: string;
  context_id?: string;
  created_at: string;
  sound?: boolean;
  icon?: string;
}

export interface SSEMessage {
  event: string;
  data: any;
}

export interface SSEConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: SSEMessage | null;
}

// Event handlers interface
export interface SSEEventHandlers {
  onNotification?: (notification: SSENotification) => void;
  onRecentNotifications?: (data: {
    notifications: SSENotification[];
    count: number;
  }) => void;
  onHeartbeat?: () => void;
  onConnected?: () => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

export function useSSE(eventHandlers?: SSEEventHandlers) {
  const { user, isAuthenticated } = useAuth();
  const [connectionState, setConnectionState] = useState<SSEConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1 second
  const maxReconnectDelay = 30000; // 30 seconds

  // Calculate exponential backoff delay
  const getReconnectDelay = useCallback(() => {
    const exponentialDelay =
      baseReconnectDelay * Math.pow(2, reconnectAttempts.current);
    return Math.min(exponentialDelay, maxReconnectDelay);
  }, []);

  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playNotificationSound = useCallback(
    (priority: string, shouldPlaySound: boolean = true) => {
      if (!shouldPlaySound) return;

      try {
        const audioContext = getAudioContext();

        const frequencies: Record<string, number> = {
          low: 300,
          normal: 400,
          high: 600,
          urgent: 800,
        };

        const frequency = frequencies[priority] || frequencies.normal;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = "sine";

        const volume =
          priority === "urgent" ? 0.3 : priority === "high" ? 0.2 : 0.1;
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.5,
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

        if (priority === "urgent") {
          setTimeout(() => {
            const ctx = getAudioContext();
            const oscillator2 = ctx.createOscillator();
            const gainNode2 = ctx.createGain();
            oscillator2.connect(gainNode2);
            gainNode2.connect(ctx.destination);
            oscillator2.frequency.value = frequency;
            oscillator2.type = "sine";
            gainNode2.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode2.gain.exponentialRampToValueAtTime(
              0.01,
              ctx.currentTime + 0.3,
            );
            oscillator2.start();
            oscillator2.stop(ctx.currentTime + 0.3);
          }, 600);
        }
      } catch (error) {
        console.warn("Could not play notification sound:", error);
      }
    },
    [getAudioContext],
  );

  // Clean up existing connection
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }));
  }, []);

  // Establish SSE connection
  const connect = useCallback(() => {
    if (!isAuthenticated || !user) {
      console.log("[SSE] Not authenticated, skipping connection");
      return;
    }

    if (eventSourceRef.current) {
      console.log("[SSE] Connection already exists");
      return;
    }

    setConnectionState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    console.log("[SSE] Establishing connection...");

    try {
      const eventSource = new EventSource("/api/notifications/stream", {
        withCredentials: true,
      });

      eventSourceRef.current = eventSource;

      // Handle connection opened
      eventSource.onopen = () => {
        console.log("[SSE] Connection established successfully");
        reconnectAttempts.current = 0;
        setConnectionState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
        }));
      };

      // Handle general messages
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setConnectionState((prev) => ({
            ...prev,
            lastMessage: { event: "message", data },
          }));
          console.log("[SSE] Received message:", data);
        } catch (error) {
          console.error("[SSE] Error parsing message:", error);
        }
      };

      // Handle specific events

      // Connection confirmation
      eventSource.addEventListener("connected", (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[SSE] Connected event received:", data);
          eventHandlers?.onConnected?.();
        } catch (error) {
          console.error("[SSE] Error parsing connected event:", error);
        }
      });

      // New notification received
      eventSource.addEventListener("notification", (event) => {
        try {
          const notification: SSENotification = JSON.parse(event.data);
          console.log("[SSE] Notification received:", notification);

          setConnectionState((prev) => ({
            ...prev,
            lastMessage: { event: "notification", data: notification },
          }));

          // Play sound if specified
          if (notification.sound) {
            playNotificationSound(notification.priority, true);
          }

          // Call handler if provided
          eventHandlers?.onNotification?.(notification);
        } catch (error) {
          console.error("[SSE] Error parsing notification event:", error);
        }
      });

      // Recent notifications on connection
      eventSource.addEventListener("recent_notifications", (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[SSE] Recent notifications received:", data);
          eventHandlers?.onRecentNotifications?.(data);
        } catch (error) {
          console.error("[SSE] Error parsing recent notifications:", error);
        }
      });

      // Heartbeat to keep connection alive
      eventSource.addEventListener("heartbeat", (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[SSE] Heartbeat received:", data.timestamp);
          eventHandlers?.onHeartbeat?.();
        } catch (error) {
          console.error("[SSE] Error parsing heartbeat:", error);
        }
      });

      // Handle connection errors
      eventSource.onerror = (event) => {
        console.error("[SSE] Connection error:", event);

        const errorMessage =
          eventSource.readyState === EventSource.CLOSED
            ? "اتصال مقطوع"
            : "خطأ في الاتصال";

        setConnectionState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: errorMessage,
        }));

        // Call error handler
        eventHandlers?.onError?.(event);

        // Attempt to reconnect if not manually closed
        if (
          eventSource.readyState !== EventSource.CLOSED &&
          reconnectAttempts.current < maxReconnectAttempts
        ) {
          const delay = getReconnectDelay();
          console.log(
            `[SSE] Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts.current + 1})`,
          );

          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            cleanup();
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error("[SSE] Max reconnection attempts reached");
          setConnectionState((prev) => ({
            ...prev,
            error: "فشل في إعادة الاتصال - يرجى تحديث الصفحة",
          }));
        }
      };
    } catch (error) {
      console.error("[SSE] Error creating EventSource:", error);
      setConnectionState((prev) => ({
        ...prev,
        isConnecting: false,
        error: "فشل في إنشاء الاتصال",
      }));
    }
  }, [
    isAuthenticated,
    user,
    eventHandlers,
    cleanup,
    getReconnectDelay,
    playNotificationSound,
  ]);

  // Manual reconnection function
  const reconnect = useCallback(() => {
    console.log("[SSE] Manual reconnection requested");
    reconnectAttempts.current = 0;
    cleanup();
    setTimeout(connect, 1000); // Small delay to ensure cleanup is complete
  }, [cleanup, connect]);

  // Disconnect manually
  const disconnect = useCallback(() => {
    console.log("[SSE] Manual disconnection requested");
    cleanup();
    eventHandlers?.onClose?.();
  }, [cleanup, eventHandlers]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("[SSE] User authenticated, establishing connection");
      connect();
    } else {
      console.log("[SSE] User not authenticated, cleaning up connection");
      cleanup();
    }

    return cleanup;
  }, [isAuthenticated, user, connect, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [cleanup]);

  // Handle page visibility changes - reconnect when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        isAuthenticated &&
        user &&
        !connectionState.isConnected &&
        !connectionState.isConnecting
      ) {
        console.log("[SSE] Page became visible, attempting to reconnect");
        reconnect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [
    isAuthenticated,
    user,
    connectionState.isConnected,
    connectionState.isConnecting,
    reconnect,
  ]);

  return {
    connectionState,
    reconnect,
    disconnect,
  };
}
