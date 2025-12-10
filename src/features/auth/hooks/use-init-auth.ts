import { useEffect, useState } from "react";

import { authApi } from "../services/auth-api";
import { useAuthStore } from "../store/auth-store";
import { isTokenExpired } from "../utils/jwt-utils";

type InitStatus = "idle" | "hydrating" | "validating" | "ready" | "error";

/**
 * Handles app auth initialization on startup.
 * Linear flow: idle -> hydrating -> validating -> ready/error.
 * Ensures no race conditions during hydration/refresh.
 */
export const useInitAuth = () => {
  const [status, setStatus] = useState<InitStatus>("idle");
  const isReady = status === "ready";

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Step 1: Wait for Zustand hydration from SecureStore
        if (!useAuthStore.persist.hasHydrated()) {
          setStatus("hydrating");
          await new Promise<void>((resolve, reject) => {
            const unsub = useAuthStore.persist.onFinishHydration(() => {
              unsub();
              resolve();
            });
            // Timeout fallback if hydration hangs (rare)
            setTimeout(reject, 5000);
          });
        }

        if (!mounted) return;
        setStatus("validating");

        // Step 2: Get current tokens
        const { accessToken, refreshToken, setTokens, clearTokens } =
          useAuthStore.getState();

        // No tokens: ready (unauthenticated)
        if (!accessToken || !refreshToken) {
          setStatus("ready");
          return;
        }

        // Step 3: Check expiry
        if (!isTokenExpired(accessToken)) {
          setStatus("ready");
          return;
        }

        // Step 4: Refresh expired token
        const { access_token, refresh_token } = await authApi.refreshTokens({
          refreshToken,
        });
        if (mounted) {
          setTokens(access_token, refresh_token);
          setStatus("ready");
        }
      } catch (error) {
        console.warn("[Auth Init] Failed:", error);
        if (mounted) {
          useAuthStore.getState().clearTokens();
          setStatus("ready"); // Ready but unauthenticated
        }
      }

      if (!mounted) setStatus("error");
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  return { isReady, status }; // Export status for debugging if needed
};
