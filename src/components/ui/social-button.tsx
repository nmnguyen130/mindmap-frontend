import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/components/providers/theme-provider';
import GoogleLogo from 'assets/images/google.svg';
import FacebookLogo from 'assets/images/facebook.svg';

type SocialProvider = 'google' | 'facebook';

interface SocialButtonProps {
    provider: SocialProvider;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
}

const providerConfig: Record<SocialProvider, { label: string; Logo: any }> = {
    google: {
        label: 'Continue with Google',
        Logo: GoogleLogo,
    },
    facebook: {
        label: 'Continue with Facebook',
        Logo: FacebookLogo,
    },
};

const SocialButton = ({
    provider,
    onPress,
    disabled = false,
    loading = false
}: SocialButtonProps) => {
    const { colors, isDark } = useTheme();
    const config = providerConfig[provider];
    const Logo = config.Logo;

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            className={`relative flex-row items-center justify-center px-4 rounded-xl border h-14 ${disabled || loading ? 'opacity-60' : 'active:opacity-70'}`}
            style={{
                backgroundColor: isDark ? colors.surface : colors.background,
                borderColor: colors.border,
            }}
        >
            {loading ? (
                <View className="items-center justify-center">
                    <Text style={{ color: colors.mutedForeground }}>Loading...</Text>
                </View>
            ) : (
                <>
                    <View className="absolute left-8">
                        <Logo width={32} height={32} />
                    </View>
                    <Text
                        className="text-base font-medium text-center"
                        style={{ color: colors.foreground }}
                    >
                        {config.label}
                    </Text>
                </>
            )}
        </Pressable>
    );
};

export default SocialButton;
