import * as Notifications from 'expo-notifications';
import { type Href, router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerForPush } from '@/lib/notifications';

const ALLOWED_URLS = ['/', '/quests', '/journal', '/team', '/settings'];

function openFromNotification(response: Notifications.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url;
  if (typeof url === 'string' && ALLOWED_URLS.includes(url)) {
    router.navigate(url as Href);
    Notifications.clearLastNotificationResponse();
  }
}

/** Enregistre l'appareil pour les notifications et ouvre l'onglet visé au toucher d'une notification. */
export function usePushNotifications() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    registerForPush();
    // Application lancée par le toucher d'une notification.
    openFromNotification(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(openFromNotification);
    return () => subscription.remove();
  }, []);
}
