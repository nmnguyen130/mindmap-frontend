import { useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncService, SyncResult } from '@/features/sync/services/sync-service';

export interface NetworkSyncState {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncAt: Date | null;
    pendingChanges: number;
    lastSyncResult: SyncResult | null;
    syncNow: () => Promise<void>;
}

export function useNetworkSync(autoSyncInterval: number = 60000): NetworkSyncState {
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
    const [pendingChanges, setPendingChanges] = useState(0);
    const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

    const performSync = useCallback(async () => {
        if (isSyncing || !isOnline) return;

        setIsSyncing(true);
        try {
            const result = await syncService.sync();

            setLastSyncResult(result);
            setLastSyncAt(new Date());

            // Update pending changes count after sync
            const count = await syncService.getPendingChangesCount();
            setPendingChanges(count);

            if (result.conflicts > 0) {
                console.warn(`Sync completed with ${result.conflicts} conflicts`);
            }

            if (result.failed > 0) {
                console.warn(`Sync completed with ${result.failed} failures`);
            }
        } catch (error) {
            console.error('Auto-sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, isOnline]);

    // Monitor network status
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state: any) => {
            const wasOffline = !isOnline;
            const isNowOnline = state.isConnected ?? false;

            setIsOnline(isNowOnline);

            // Auto-sync when coming back online
            if (wasOffline && isNowOnline) {
                console.log('Network restored, triggering sync...');
                void performSync();
            }
        });

        return () => unsubscribe();
    }, [isOnline, performSync]);

    // Auto-sync at regular intervals when online
    useEffect(() => {
        if (!isOnline) return;

        // Initial sync
        void performSync();

        const interval = setInterval(() => {
            void performSync();
        }, autoSyncInterval);

        return () => clearInterval(interval);
    }, [isOnline, autoSyncInterval, performSync]);

    // Update pending changes count
    useEffect(() => {
        const updatePendingCount = async () => {
            try {
                const count = await syncService.getPendingChangesCount();
                setPendingChanges(count);
            } catch (error) {
                console.error('Failed to get pending changes count:', error);
            }
        };

        void updatePendingCount();

        // Check every 10 seconds
        const interval = setInterval(updatePendingCount, 10000);
        return () => clearInterval(interval);
    }, []);

    const syncNow = useCallback(async () => {
        await performSync();
    }, [performSync]);

    return {
        isOnline,
        isSyncing,
        lastSyncAt,
        pendingChanges,
        lastSyncResult,
        syncNow,
    };
}
