import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Alarm } from "../store/alarmStore";
import { useAlarmStore } from "../store/alarmStore";

const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND_NOTIFICATION_TASK";

// Registra a task ANTES do app montar — precisa ficar fora de qualquer componente
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error }: any) => {
  if (error) {
    console.error("Background task error:", error);
    return;
  }
  if (data?.notification) {
    const alarm = data.notification.request.content.data?.alarm;
    if (alarm) {
      useAlarmStore.getState().setRinging(alarm);
    }
  }
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerBackgroundTask() {
  try {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
  } catch (e) {
    console.log("Background task já registrada ou erro:", e);
  }
}

export function setupAlarmListener() {
  const subReceived = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as any;
    if (data?.alarm) {
      useAlarmStore.getState().setRinging(data.alarm);
    }
  });

  const subResponse = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as any;
    if (data?.alarm) {
      useAlarmStore.getState().setRinging(data.alarm);
    }
  });

  return () => {
    subReceived.remove();
    subResponse.remove();
  };
}

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleAlarm(alarm: Alarm) {
  await cancelAlarm(alarm.id);
  if (!alarm.active) return;

  const content = {
    title: "⏰ ALERT",
    body: alarm.label || "Hora de acordar!",
    sound: "alarm_default.mp3",
    data: { alarm },
  };

  if (alarm.days.length === 0) {
    await Notifications.scheduleNotificationAsync({
      identifier: alarm.id,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextOccurrence(alarm.hour, alarm.minute),
      },
    });
  } else {
    for (const day of alarm.days) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${alarm.id}_${day}`,
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day + 1,
          hour: alarm.hour,
          minute: alarm.minute,
        },
      });
    }
  }
}

export async function scheduleSnooze(alarm: Alarm, minutes = 5) {
  const snoozeDate = new Date(Date.now() + minutes * 60 * 1000);
  await Notifications.scheduleNotificationAsync({
    identifier: `${alarm.id}_snooze`,
    content: {
      title: "⏰ ALERT — Soneca",
      body: alarm.label || "Hora de acordar!",
      sound: "alarm_default.mp3",
      data: { alarm },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: snoozeDate,
    },
  });
}

export async function cancelAlarm(id: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier === id || n.identifier.startsWith(`${id}_`)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

function nextOccurrence(hour: number, minute: number): Date {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}