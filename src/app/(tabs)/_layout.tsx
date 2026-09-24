import { Tabs } from 'expo-router/js-tabs';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Toast } from '@/components/duo';
import { useRealtimeSync } from '@/hooks/use-duo';
import { useNames } from '@/hooks/use-names';
import { describeActivity } from '@/lib/describe';
import { usePalette } from '@/theme';
import type { ActivityEvent } from '@/types/models';

const ICONS: Record<string, string> = {
  index: '🏠',
  quests: '🎯',
  journal: '📔',
  team: '💞',
  settings: '⚙️',
};

export default function TabsLayout() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { nameOf, partnerName } = useNames();
  const [toast, setToast] = useState<string | null>(null);

  const onPartnerActivity = useCallback(
    (event: ActivityEvent) => setToast(describeActivity(t, event, { nameOf, partnerName })),
    [t, nameOf, partnerName],
  );
  useRealtimeSync(onPartnerActivity);
  const hideToast = useCallback(() => setToast(null), []);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: palette.primary,
          tabBarInactiveTintColor: palette.textMuted,
          tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.border },
          tabBarLabelStyle: { lineHeight: 16, paddingTop: 2 },
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{ICONS[route.name] ?? '•'}</Text>
          ),
        })}>
        <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
        <Tabs.Screen name="quests" options={{ title: t('tabs.quests') }} />
        <Tabs.Screen name="journal" options={{ title: t('tabs.journal') }} />
        <Tabs.Screen name="team" options={{ title: t('tabs.team') }} />
        <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
      </Tabs>
      <Toast message={toast} onHide={hideToast} />
    </View>
  );
}
