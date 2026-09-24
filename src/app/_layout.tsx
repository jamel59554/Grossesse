import '@/i18n';

import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText, Card, Loading, Screen } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';

// Rafraîchit les données au retour au premier plan.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => focusManager.setFocused(status === 'active'));
}

function RootNavigator() {
  const { session, membership, loading } = useAuth();
  if (loading) return <Loading />;
  const signedIn = session !== null;
  const inDuo = signedIn && membership !== null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !inDuo}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={inDuo}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

function MissingConfig() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Card>
        <AppText variant="title">{t('config.title')}</AppText>
        <AppText>{t('config.body')}</AppText>
      </Card>
    </Screen>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );
  useEffect(() => () => queryClient.clear(), [queryClient]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style="auto" />
        {isSupabaseConfigured ? (
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </QueryClientProvider>
        ) : (
          <MissingConfig />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
