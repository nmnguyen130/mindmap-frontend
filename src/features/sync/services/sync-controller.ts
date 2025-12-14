import { AppState, AppStateStatus } from "react-native";
import NetInfo, {
  NetInfoState,
  NetInfoSubscription,
} from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

import { syncService } from "./sync-service";
import { useSyncStore } from "../store/sync-store";

export interface SyncControllerConfig {
  autoSyncIntervalMs: number;
  getAccessToken: () => string | null;
}

/**
 * SyncController - Unified event-loop for sync lifecycle.
 *
 * Consolidates 4 separate listeners into a single controller:
 * - Network status (NetInfo)
 * - App state (foreground/background)
 * - Auto-sync interval
 * - Manual sync triggers
 */
export class SyncController {
  private config: SyncControllerConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private netInfoUnsubscribe: NetInfoSubscription | null = null;
  private appStateSubscription: ReturnType<
    typeof AppState.addEventListener
  > | null = null;
  private isRunning = false;

  constructor(config: SyncControllerConfig) {
    this.config = config;
  }

  /** Start all listeners and initial sync */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Initial sync
    this.tick();

    // Network listener
    this.netInfoUnsubscribe = NetInfo.addEventListener(
      this.handleNetworkChange
    );

    // App state listener
    this.appStateSubscription = AppState.addEventListener(
      "change",
      this.handleAppStateChange
    );

    // Auto-sync interval
    this.intervalId = setInterval(
      () => this.tick(),
      this.config.autoSyncIntervalMs
    );
  }

  /** Stop all listeners and cleanup */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    useSyncStore.getState().reset();
  }

  /** Run sync once (main tick) */
  async tick(): Promise<void> {
    // Still check for auth before syncing (avoids unnecessary sync attempts)
    const accessToken = this.config.getAccessToken();
    if (!accessToken) return;

    const { isOnline, isSyncing } = useSyncStore.getState();
    if (!isOnline || isSyncing) return;

    const { setSyncing, setSyncResult, setSyncError, setPendingChanges } =
      useSyncStore.getState();

    setSyncing(true);
    try {
      // sync() now gets fresh token from store via fetchWithAuth
      const result = await syncService.sync();
      setSyncResult(result);
      const count = await syncService.getPendingChangesCount();
      setPendingChanges(count);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      setSyncError(message);
    } finally {
      setSyncing(false);
    }
  }

  /** Handle network status changes */
  private handleNetworkChange = (state: NetInfoState): void => {
    const isOnline = state.isConnected ?? false;
    const wasOffline = !useSyncStore.getState().isOnline;

    useSyncStore.getState().setOnline(isOnline);
    onlineManager.setOnline(isOnline);

    // Auto-sync when coming back online
    if (wasOffline && isOnline) {
      this.onOnline();
    }
  };

  /** Handle app state changes */
  private handleAppStateChange = (status: AppStateStatus): void => {
    if (status === "active") {
      this.onForeground();
    }
  };

  /** Called when network comes back online */
  onOnline(): void {
    this.tick();
  }

  /** Called when app returns to foreground */
  onForeground(): void {
    this.tick();
  }

  /** Update auto-sync interval without recreating controller */
  updateInterval(ms: number): void {
    this.config.autoSyncIntervalMs = ms;
    if (this.intervalId && this.isRunning) {
      clearInterval(this.intervalId);
      this.intervalId = setInterval(() => this.tick(), ms);
    }
  }
}
