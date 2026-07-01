import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useRef, useState } from "react";

import { useAuth } from "./use-auth";

interface ProductionSSEEvent {
  type: "film" | "printing" | "cutting" | "all";
  timestamp: string;
  queues: string[];
}

export function useProductionSSE() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const handleProductionUpdate = useCallback(
    (event: MessageEvent) => {
      try {
        const data: ProductionSSEEvent = JSON.parse(event.data);

        console.log("[ProductionSSE] Received production update:", data);

        // Invalidate relevant queries based on the update type
        const queriesToInvalidate = [];

        if (data.type === "all" || data.queues.includes("film")) {
          queriesToInvalidate.push(
            ["/api/production/film-queue"],
            ["/api/production/hierarchical-orders"],
          );
        }

        if (data.type === "all" || data.queues.includes("printing")) {
          queriesToInvalidate.push(["/api/production/printing-queue"]);
        }

        if (data.type === "all" || data.queues.includes("cutting")) {
          queriesToInvalidate.push(
            ["/api/production/cutting-queue"],
            ["/api/production/grouped-cutting-queue"],
          );
        }

        // Invalidate all relevant queries
        queriesToInvalidate.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey });
        });
      } catch (error) {
        console.error(
          "[ProductionSSE] Error parsing production update:",
          error,
        );
      }
    },
    [queryClient],
  );

  const connect = useCallback(() => {
    // Don't connect if not authenticated
    if (!isAuthenticated || !user) {
      console.log("[ProductionSSE] Not authenticated, skipping connection");
      return;
    }

    // Don't connect if already connected or if we've exceeded max attempts
    if (
      eventSourceRef.current &&
      eventSourceRef.current.readyState !== EventSource.CLOSED
    ) {
      return; // Already connected or connecting
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log(
        "[ProductionSSE] Max reconnection attempts reached, stopping...",
      );
      return;
    }

    // Clean up any existing connection first
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      console.log("[ProductionSSE] Connecting to production updates stream...");

      const eventSource = new EventSource("/api/notifications/stream", {
        withCredentials: true,
      });

      eventSource.addEventListener("production_update", handleProductionUpdate);

      eventSource.onopen = () => {
        console.log("[ProductionSSE] Connected to production updates stream");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset reconnection attempts on successful connection

        // Clear any reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      eventSource.onerror = (error) => {
        console.error("[ProductionSSE] Connection error:", error);
        setIsConnected(false);

        // Always close the failing EventSource ourselves so we don't end up
        // with overlapping connections when the browser keeps it in CONNECTING
        // state during transient errors. We then take full control of the
        // reconnect timing via exponential backoff below.
        try {
          eventSource.close();
        } catch {
          /* noop */
        }
        if (eventSourceRef.current === eventSource) {
          eventSourceRef.current = null;
        }

        // Increment reconnection attempts
        reconnectAttemptsRef.current += 1;

        // Only attempt to reconnect if we haven't exceeded max attempts
        if (
          reconnectAttemptsRef.current < maxReconnectAttempts &&
          !reconnectTimeoutRef.current
        ) {
          // Exponential backoff: 2^(attempts-1) * 1000ms (1s, 2s, 4s, 8s, 16s)
          const delay = Math.min(
            Math.pow(2, reconnectAttemptsRef.current - 1) * 1000,
            30000,
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(
              `[ProductionSSE] Attempting to reconnect... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
            );
            reconnectTimeoutRef.current = null;
            connect();
          }, delay);
        } else {
          console.log(
            "[ProductionSSE] Max reconnection attempts reached or timeout already set",
          );
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error("[ProductionSSE] Failed to establish connection:", error);
      setIsConnected(false);
      reconnectAttemptsRef.current += 1;

      // Try to reconnect if we haven't hit the limit
      if (
        reconnectAttemptsRef.current < maxReconnectAttempts &&
        !reconnectTimeoutRef.current
      ) {
        const delay = Math.min(
          Math.pow(2, reconnectAttemptsRef.current - 1) * 1000,
          30000,
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, delay);
      }
    }
  }, [handleProductionUpdate, isAuthenticated, user]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log(
        "[ProductionSSE] Disconnecting from production updates stream",
      );
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
    reconnectAttemptsRef.current = 0; // Reset reconnection attempts
  }, []);

  // Manual refresh function for user-triggered updates
  const refreshProductionData = useCallback(() => {
    console.log("[ProductionSSE] Manual refresh triggered");

    // Invalidate all production-related queries
    const productionQueries = [
      ["/api/production/film-queue"],
      ["/api/production/printing-queue"],
      ["/api/production/cutting-queue"],
      ["/api/production/grouped-cutting-queue"],
      ["/api/production/hierarchical-orders"],
    ];

    productionQueries.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });
  }, [queryClient]);

  useEffect(() => {
    // Only connect when authenticated
    if (isAuthenticated && user) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect, isAuthenticated, user]);

  return {
    isConnected,
    connect,
    disconnect,
    refreshProductionData,
  };
}
