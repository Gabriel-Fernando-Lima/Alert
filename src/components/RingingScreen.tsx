import { View, Text, TouchableOpacity, StyleSheet, Vibration } from "react-native";
import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useAlarmStore, Alarm } from "@/src/store/alarmStore";
import { useAlarmRinging } from "@/src/services/audio";
import { scheduleSnooze } from "@/src/services/notifications";

type Props = { alarm: Alarm };

export function RingingScreen({ alarm }: Props) {
  const setRinging = useAlarmStore((s) => s.setRinging);
  const { startRinging, stopRinging } = useAlarmRinging();

  useEffect(() => {
    startRinging();
    Vibration.vibrate([500, 500, 500, 500], true);
    return () => {
      stopRinging();
      Vibration.cancel();
    };
  }, []);

  function handleStop() {
    stopRinging();
    Vibration.cancel();
    setRinging(null);
  }

  async function handleSnooze() {
    stopRinging();
    Vibration.cancel();
    await scheduleSnooze(alarm, 5);
    setRinging(null);
  }

  function formatTime(hour: number, minute: number) {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  return (
    <View style={styles.overlay}>
      <Ionicons name="alarm" size={80} color="#6C63FF" />

      <Text style={styles.time}>{formatTime(alarm.hour, alarm.minute)}</Text>
      {alarm.label ? <Text style={styles.label}>{alarm.label}</Text> : null}

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.snoozeBtn}
          onPress={handleSnooze}
          accessibilityLabel="Soneca por 5 minutos"
          accessibilityRole="button"
        >
          <Ionicons name="time-outline" size={24} color="#fff" />
          <Text style={styles.snoozeText}>Soneca (5 min)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.stopBtn}
          onPress={handleStop}
          accessibilityLabel="Parar alarme"
          accessibilityRole="button"
        >
          <Ionicons name="stop-circle" size={28} color="#fff" />
          <Text style={styles.stopText}>Parar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    zIndex: 999,
  },
  time: {
    fontSize: 80,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 4,
  },
  label: {
    fontSize: 20,
    color: "#888",
  },
  buttons: {
    gap: 16,
    marginTop: 40,
    width: "100%",
    paddingHorizontal: 32,
  },
  snoozeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#333",
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 50,
  },
  snoozeText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#ff4444",
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 50,
  },
  stopText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
});