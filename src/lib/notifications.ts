import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

const DAILY_REMINDER_ID = 'daily-reminder';
const DAILY_REMINDER_KEY = 'duo:daily-reminder';
const PUSH_TOKEN_KEY = 'duo:push-token';
export const DAILY_REMINDER_HOUR = 20;

// Au premier plan, le bandeau in-app suffit : on garde seulement la notification dans le centre.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export type PushAvailability = 'ok' | 'web' | 'simulator' | 'expo-go-android' | 'no-project' | 'denied';

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Pourquoi les notifications push ne peuvent pas fonctionner sur cet appareil, le cas échéant. */
export function pushAvailability(): Exclude<PushAvailability, 'denied'> {
  if (Platform.OS === 'web') return 'web';
  if (!Device.isDevice) return 'simulator';
  if (Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return 'expo-go-android';
  }
  if (!projectId()) return 'no-project';
  return 'ok';
}

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Duo',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#D9574A',
    });
  }
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Enregistre le jeton Expo de l'appareil pour l'utilisateur connecté. */
export async function registerForPush(): Promise<PushAvailability> {
  const availability = pushAvailability();
  if (availability !== 'ok') return availability;
  try {
    await ensureChannel();
    if (!(await ensurePermission())) return 'denied';
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    const { error } = await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    if (error) throw error;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return 'ok';
  } catch (error) {
    console.warn('Enregistrement des notifications impossible', error);
    return availability;
  }
}

/** À appeler avant la déconnexion : l'appareil ne reçoit plus les alertes de ce compte. */
export async function unregisterPush(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await supabase.from('push_tokens').delete().eq('token', token);
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
    await setDailyReminder(false);
  } catch (error) {
    console.warn('Désinscription des notifications impossible', error);
  }
}

export async function isDailyReminderEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return (await AsyncStorage.getItem(DAILY_REMINDER_KEY)) === 'on';
}

/** Rappel local quotidien (aucun serveur) : fonctionne aussi dans Expo Go. */
export async function setDailyReminder(
  enabled: boolean,
  content?: { title: string; body: string },
): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => undefined);
  if (!enabled) {
    await AsyncStorage.setItem(DAILY_REMINDER_KEY, 'off');
    return false;
  }
  await ensureChannel();
  if (!(await ensurePermission())) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: { ...content!, data: { url: '/quests' } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour: DAILY_REMINDER_HOUR,
      minute: 0,
      repeats: true,
      channelId: 'default',
    },
  });
  await AsyncStorage.setItem(DAILY_REMINDER_KEY, 'on');
  return true;
}
