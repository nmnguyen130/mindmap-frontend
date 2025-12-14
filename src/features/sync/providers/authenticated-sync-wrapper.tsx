import React from "react";

import {
  useAuthStore,
  selectAccessToken,
} from "@/features/auth/store/auth-store";
import { SyncProvider } from "./sync-provider";

interface AuthenticatedSyncWrapperProps {
  children: React.ReactNode;
}

/**
 * Conditionally renders SyncProvider only when authenticated.
 * Prevents SyncProvider from mounting before auth hydration completes.
 */
export const AuthenticatedSyncWrapper: React.FC<
  AuthenticatedSyncWrapperProps
> = ({ children }) => {
  const accessToken = useAuthStore(selectAccessToken);
  const isAuthenticated = !!accessToken;

  if (!isAuthenticated) {
    // Not authenticated - render children directly without sync
    return <>{children}</>;
  }

  // Authenticated - wrap with SyncProvider
  return <SyncProvider>{children}</SyncProvider>;
};
