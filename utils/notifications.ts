import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Debt } from '@/types';

// 本地通知配置（仅原生端生效，Web 端跳过）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'debt-reminders';

export async function ensureNotificationSetup(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: '还款提醒',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const settings = await Notifications.getPermissionsAsync();
    if (!settings.granted) {
      const req = await Notifications.requestPermissionsAsync();
      return req.granted;
    }
    return settings.granted;
  } catch {
    return false;
  }
}

/** 撤销所有已安排的还款提醒 */
export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

/**
 * 为每笔开启提醒的债务安排每月循环提醒（还款日当天或提前 remindDays 天）。
 */
export async function scheduleAllReminders(debts: Debt[]): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await cancelAllReminders();
    for (const d of debts) {
      if (!d.remindEnabled) continue;
      if (!(d.dueDay >= 1 && d.dueDay <= 31)) continue;
      const day = Math.min(Math.max(d.dueDay - d.remindDays, 1), 28);
      const title = d.remindDays > 0
        ? `明天（${d.name}）该还款了`
        : `今天（${d.name}）是还款日`;
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: `${d.name} 需还最低 ${d.minPayment.toFixed(2)} 元，剩余本金 ${d.principal.toFixed(2)} 元`,
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: 9,
          minute: 0,
          day,
          channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
        } as never,
      });
    }
  } catch {
    // 忽略通知异常，不影响核心功能
  }
}