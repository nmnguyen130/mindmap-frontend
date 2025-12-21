/**
 * Sync Configuration
 * Set SYNC_ENABLED to false to temporarily disable all backend sync
 */
export const SYNC_CONFIG = {
  /**
   * Master switch to enable/disable sync
   * Set to false during development/debugging
   */
  SYNC_ENABLED: false, // ← TEMPORARILY DISABLED

  /**
   * Auto sync interval in milliseconds
   */
  AUTO_SYNC_INTERVAL_MS: 60000,
};
