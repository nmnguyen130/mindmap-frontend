import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Get the API base URL based on the platform
 * - iOS Simulator: localhost
 * - Android Emulator: 10.0.2.2 (special alias for host machine)
 * - Physical Device: Use the host machine's IP in development
 */
const getApiBaseUrl = (): string => {
    const devHostname = Constants.expoConfig?.hostUri?.split(':')[0];

    if (__DEV__) {
        // Physical device - use the dev server's hostname
        if (devHostname) {
            return `http://${devHostname}:4000`;
        }

        if (Platform.OS === 'android') {
            // Android emulator uses 10.0.2.2 to access host machine's localhost
            return 'http://10.0.2.2:4000';
        }

        if (Platform.OS === 'ios') {
            // iOS simulator can use localhost
            return 'http://localhost:4000';
        }
    }

    // Production URL - replace with your actual production API URL
    return 'https://api.yourapp.com';
};

export const API_BASE_URL = getApiBaseUrl();

// Token storage keys
export const TOKEN_KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
} as const;
