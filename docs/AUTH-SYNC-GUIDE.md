# Auth & Sync Usage Guide

## Quick Start

### App Setup (`_layout.tsx`)

```tsx
import { AuthProvider } from "@/features/auth";
import { AuthenticatedSyncWrapper } from "@/features/sync";

// Wrap your app with these providers (order matters)
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <AuthenticatedSyncWrapper>{/* Your app */}</AuthenticatedSyncWrapper>
  </AuthProvider>
</QueryClientProvider>;
```

---

## Auth Feature

### Login/Logout

```tsx
import { useAuth } from "@/features/auth";

function LoginScreen() {
  const { login, isAuthenticated, user } = useAuth();

  const handleLogin = async () => {
    await login.mutateAsync({ email, password });
    // Tokens automatically saved, user derived from JWT
  };
}

function ProfileScreen() {
  const { logout, user, isAuthenticated } = useAuth();

  // user = { id, email } derived from JWT
  // logout clears tokens and redirects
}
```

### Available Hooks & Exports

```tsx
import {
  useAuth, // Main hook: login, logout, register, user, isAuthenticated
  useAuthStore, // Direct Zustand store access (advanced)
  selectAccessToken, // Selector for token (no re-render on other changes)
  AuthProvider, // Wrap app - handles hydration loading
  fetchWithAuth, // Authenticated fetch with 401 retry
} from "@/features/auth";
```

---

## Sync Feature

### Automatic Sync

Sync runs automatically when:

- App starts (if authenticated)
- App returns to foreground
- Network reconnects
- Every 60 seconds (configurable)

No manual setup needed - just wrap with `AuthenticatedSyncWrapper`.

### Manual Sync Trigger

```tsx
import { useSyncStore } from "@/features/sync";

function SyncButton() {
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const pendingChanges = useSyncStore((s) => s.pendingChanges);

  // SyncController handles the actual sync internally
}
```

### Sync Status

```tsx
import {
  useSyncStore,
  selectIsSyncing,
  selectPendingChanges,
  selectLastSyncAt,
  selectSyncError,
} from "@/features/sync";

// Use selectors to avoid unnecessary re-renders
const isSyncing = useSyncStore(selectIsSyncing);
```

---

## Authenticated API Calls

### Using fetchWithAuth

```tsx
import { fetchWithAuth } from "@/features/auth";

// Automatic 401 retry with token refresh
const result = await fetchWithAuth<MyDataType>("/api/my-endpoint", {
  method: "POST",
  body: JSON.stringify(data),
});

if (result.error) {
  console.error(result.error); // string
} else {
  console.log(result.data); // MyDataType
}
```

### Response Format

```tsx
interface ApiResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    App                          │
│  ┌───────────────────────────────────────────┐  │
│  │              AuthProvider                 │  │
│  │  - Waits for Zustand hydration           │  │
│  │  - Shows loading during init              │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │    AuthenticatedSyncWrapper        │  │  │
│  │  │  - Only mounts SyncProvider if     │  │  │
│  │  │    token exists                     │  │  │
│  │  │  ┌───────────────────────────────┐  │  │  │
│  │  │  │        SyncProvider          │  │  │  │
│  │  │  │  - Runs SyncController       │  │  │  │
│  │  │  │  - Auto-sync interval        │  │  │  │
│  │  │  └───────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Token Refresh Flow

```
API Call → 401 → Mutex Lock → Refresh Token → Update Store → Retry → Success
                     ↓
          (Other 401s wait here, get fresh token after)
```

---

## Troubleshooting

| Issue                   | Solution                                                     |
| ----------------------- | ------------------------------------------------------------ |
| "No access token" error | User not logged in, redirect to login                        |
| Sync not running        | Check `AuthenticatedSyncWrapper` is in provider tree         |
| 401 loops               | Check refresh token is valid, backend refresh endpoint works |
| Slow hydration          | Normal on first launch, tokens loading from SecureStore      |
