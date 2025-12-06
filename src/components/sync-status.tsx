import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSyncStore, selectIsOnline, selectIsSyncing, selectLastSyncAt, selectPendingChanges, selectLastSyncResult } from '@/features/sync';
import { useAuthStore, selectAccessToken } from '@/features/auth/store/auth-store';
import { syncService } from '@/features/sync/services/sync-service';
import { useCallback } from 'react';

export function SyncStatus() {
    const isOnline = useSyncStore(selectIsOnline);
    const isSyncing = useSyncStore(selectIsSyncing);
    const lastSyncAt = useSyncStore(selectLastSyncAt);
    const pendingChanges = useSyncStore(selectPendingChanges);
    const lastSyncResult = useSyncStore(selectLastSyncResult);
    const accessToken = useAuthStore(selectAccessToken);
    const setSyncing = useSyncStore((state) => state.setSyncing);
    const setSyncResult = useSyncStore((state) => state.setSyncResult);

    const formatLastSync = (date: Date | null) => {
        if (!date) return 'Never';
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    };

    const syncNow = useCallback(async () => {
        if (!accessToken || isSyncing || !isOnline) return;

        setSyncing(true);
        try {
            const result = await syncService.sync(accessToken);
            setSyncResult(result);
        } finally {
            setSyncing(false);
        }
    }, [accessToken, isSyncing, isOnline, setSyncing, setSyncResult]);

    return (
        <View className="flex-row items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {/* Online/Offline indicator */}
            <View
                className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}
            />

            {/* Sync status */}
            <View className="flex-1">
                <Text className="text-sm text-slate-700 dark:text-slate-300">
                    {isSyncing ? 'Syncing...' : `Last sync: ${formatLastSync(lastSyncAt)}`}
                </Text>

                {/* Sync result feedback */}
                {lastSyncResult && !isSyncing && (
                    <Text className="text-xs text-slate-500 dark:text-slate-400">
                        {lastSyncResult.synced > 0 && `✓ ${lastSyncResult.synced} synced`}
                        {lastSyncResult.conflicts > 0 && ` ⚠ ${lastSyncResult.conflicts} conflicts`}
                        {lastSyncResult.failed > 0 && ` ✗ ${lastSyncResult.failed} failed`}
                    </Text>
                )}
            </View>

            {/* Pending changes badge */}
            {pendingChanges > 0 && (
                <View className="px-2 py-1 bg-orange-500 rounded-full">
                    <Text className="text-xs text-white font-semibold">
                        {pendingChanges} pending
                    </Text>
                </View>
            )}

            {/* Manual sync button */}
            <TouchableOpacity
                onPress={syncNow}
                disabled={isSyncing || !isOnline}
                className={`px-3 py-1.5 rounded-md flex-row items-center gap-1 ${isSyncing || !isOnline ? 'bg-slate-300 dark:bg-slate-700' : 'bg-blue-500'
                    }`}
            >
                {isSyncing && <ActivityIndicator size="small" color="white" />}
                <Text
                    className={`text-sm font-medium ${isSyncing || !isOnline ? 'text-slate-500 dark:text-slate-400' : 'text-white'
                        }`}
                >
                    Sync
                </Text>
            </TouchableOpacity>
        </View>
    );
}
