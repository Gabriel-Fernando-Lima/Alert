import { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  Switch, StyleSheet, Alert, Animated,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAlarmStore, Alarm } from "@/src/store/alarmStore";
import { initDB } from "@/src/db/schema";
import { scheduleAlarm, cancelAlarm } from "@/src/services/notifications";
import { auth } from "@/src/services/firebase";
import { useVoiceCommand } from "@/src/hooks/useVoiceCommand";

const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export default function AlarmsScreen() {
  const { alarms, load, remove, toggle, add } = useAlarmStore();
  const uid = auth.currentUser?.uid ?? "";
  const [voiceStatus, setVoiceStatus] = useState("");

  const { listening, transcript, startListening, stopListening } = useVoiceCommand({
    prompt: "Diga o horário do alarme...",
    onCreateAlarm: async (hour, minute, days, label) => {
      const alarm: Alarm = {
        id: Date.now().toString(),
        uid,
        label: label || "",
        hour,
        minute,
        days,
        sound: "default",
        active: true,
        created_at: Date.now(),
      };
      add(alarm);
      await scheduleAlarm(alarm);
      setVoiceStatus(`✅ Alarme criado para ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
      setTimeout(() => setVoiceStatus(""), 3000);
    },
  });

  useEffect(() => {
    initDB();
    load(uid);
  }, []);

  function handleToggle(alarm: Alarm) {
    const next = !alarm.active;
    toggle(alarm.id, next, uid);
    if (next) scheduleAlarm({ ...alarm, active: true });
    else cancelAlarm(alarm.id);
  }

  function handleDelete(alarm: Alarm) {
    Alert.alert(
      "Excluir alarme",
      `Deseja excluir "${alarm.label || formatTime(alarm.hour, alarm.minute)}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            cancelAlarm(alarm.id);
            remove(alarm.id, uid);
          },
        },
      ]
    );
  }

  function formatTime(hour: number, minute: number) {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function handleVoiceBtn() {
    if (listening) {
      stopListening();
    } else {
      setVoiceStatus("🎤 Ouvindo...");
      startListening();
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Meus Alarmes</Text>

      {/* Status de voz */}
      {voiceStatus ? (
        <View style={styles.voiceStatus}>
          <Text style={styles.voiceStatusText}>{voiceStatus}</Text>
        </View>
      ) : null}

      {alarms.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="alarm-outline" size={64} color="#333" />
          <Text style={styles.emptyText}>Nenhum alarme criado</Text>
          <Text style={styles.emptySubtext}>Toque no + ou no mic para adicionar</Text>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={[styles.card, !item.active && styles.cardInactive]}>
              <TouchableOpacity
                style={styles.cardLeft}
                onPress={() => router.push({ pathname: "/(tabs)/alarms/create" as any, params: { id: item.id } })}
                accessibilityLabel={`Editar alarme ${formatTime(item.hour, item.minute)}`}
              >
                <Text style={[styles.time, !item.active && styles.textInactive]}>
                  {formatTime(item.hour, item.minute)}
                </Text>
                {item.label ? <Text style={styles.label}>{item.label}</Text> : null}
                <View style={styles.days}>
                  {DAYS.map((d, i) => (
                    <Text key={i} style={[styles.day, item.days.includes(i) && styles.dayActive]}>
                      {d}
                    </Text>
                  ))}
                </View>
              </TouchableOpacity>

              <View style={styles.cardRight}>
                <Switch
                  value={item.active}
                  onValueChange={() => handleToggle(item)}
                  trackColor={{ false: "#333", true: "#6C63FF" }}
                  thumbColor="#fff"
                />
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* FAB de voz */}
      <TouchableOpacity
        style={[styles.fabVoice, listening && styles.fabVoiceActive]}
        onPress={handleVoiceBtn}
        accessibilityLabel={listening ? "Parar gravação de voz" : "Criar alarme por voz"}
        accessibilityRole="button"
      >
        <Ionicons
          name={listening ? "stop" : "mic-outline"}
          size={28}
          color="#fff"
        />
      </TouchableOpacity>

      {/* FAB de adicionar */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(tabs)/alarms/create" as any)}
        accessibilityLabel="Criar novo alarme"
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", paddingHorizontal: 20, paddingTop: 60 },
  header: { fontSize: 28, fontWeight: "bold", color: "#fff", marginBottom: 24 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  emptyText: { color: "#555", fontSize: 18, fontWeight: "600" },
  emptySubtext: { color: "#444", fontSize: 14 },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  cardInactive: { opacity: 0.5 },
  cardLeft: { gap: 4, flex: 1 },
  cardRight: { alignItems: "center", gap: 12 },
  time: { fontSize: 36, fontWeight: "bold", color: "#fff" },
  textInactive: { color: "#666" },
  label: { fontSize: 13, color: "#888" },
  days: { flexDirection: "row", gap: 6, marginTop: 4 },
  day: { fontSize: 12, color: "#444", fontWeight: "600" },
  dayActive: { color: "#6C63FF" },
  deleteBtn: { padding: 4 },
  voiceStatus: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#6C63FF",
  },
  voiceStatusText: { color: "#6C63FF", fontSize: 14, textAlign: "center" },
  transcriptBox: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  transcriptText: { color: "#888", fontSize: 13, textAlign: "center", fontStyle: "italic" },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    backgroundColor: "#6C63FF",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  fabVoice: {
    position: "absolute",
    bottom: 32,
    right: 100,
    backgroundColor: "#333",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  fabVoiceActive: {
    backgroundColor: "#ff4444",
  },
});