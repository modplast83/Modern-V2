// @refresh reset
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { AuthUser } from "@/types";

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Make context available globally for debugging
if (typeof window !== "undefined") {
  (window as any).__AuthContext = AuthContext;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for current user session via API - secure server-side validation only
    const checkAuth = async () => {
      try {
        // Security improvement: Only validate against server, no localStorage usage
        const response = await fetch("/api/me", {
          credentials: "include", // Include cookies for session validation
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
          } else {
            // Invalid response format
            setUser(null);
          }
        } else {
          // No active session on server or authentication failed
          setUser(null);
        }
      } catch (error) {
        console.warn("Error checking auth session:", error);
        // Security improvement: Don't preserve auth state on network errors
        // This ensures users must re-authenticate if server is unreachable
        setUser(null);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Ensure cookies are included in requests
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل تسجيل الدخول");
      }

      const data = await response.json();
      // Security improvement: Only store user data in memory, not localStorage
      setUser(data.user);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include", // Ensure cookies are included
      });
    } catch (error) {
      console.warn("Error during logout:", error);
    }
    // Security improvement: Only clear in-memory user state
    setUser(null);
    // Clear any cached queries related to user data
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isLoading, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error(
      "useAuth called outside AuthProvider. Current context:",
      context,
    );
    console.error("AuthContext:", AuthContext);
    // In development, provide a fallback to prevent complete app crash during HMR
    if (import.meta.env.DEV) {
      console.warn("Development fallback: returning empty auth state");
      return {
        user: null,
        login: async () => {
          throw new Error("Auth not available - please refresh page");
        },
        logout: () => {
          window.location.reload();
        },
        isLoading: false,
        isAuthenticated: false,
      };
    }
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
