import * as Notifications from "expo-notifications";
import { Alarm } from "../store/alarmStore";
import { Audio } from "expo-av";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function setupAlarmListener() {
  Notifications.addNotificationReceivedListener(async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/alarm_default.mp3"),
        { shouldPlay: true, volume: 1.0 }
      );
      // Libera memória após 60 segundos
      setTimeout(() => sound.unloadAsync(), 60000);
    } catch (e) {
      console.log("Erro ao tocar alarme:", e);
    }
  });
}

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleAlarm(alarm: Alarm) {
  await cancelAlarm(alarm.id);
  if (!alarm.active) return;

  if (alarm.days.length === 0) {
    const next = nextOccurrence(alarm.hour, alarm.minute);
    console.log("Agendando para:", next.toLocaleString());

    await Notifications.scheduleNotificationAsync({
      identifier: alarm.id,
      content: {
        title: "⏰ ALERT",
        body: alarm.label || "Hora de acordar!",
        sound: "alarm_default.mp3",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: next,
      },
    });
  } else {
    for (const day of alarm.days) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${alarm.id}_${day}`,
        content: {
          title: "⏰ ALERT",
          body: alarm.label || "Hora de acordar!",
          sound: "alarm_default.mp3",
        },
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