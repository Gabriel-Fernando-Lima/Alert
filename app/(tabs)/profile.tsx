import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, TextInput, Switch,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/src/services/firebase";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSettingsStore } from "@/src/store/settingsStore";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [checkingBiometric, setCheckingBiometric] = useState(true);
  const [editingCommands, setEditingCommands] = useState(false);
  const [newCmd, setNewCmd] = useState<{ stop: string; snooze: string; create: string }>({ stop: "", snooze: "", create: "" });


  const {
    voiceCommands, snoozeMinutes, flashEnabled, gradualVolume, autoVoice,
    load, setVoiceCommands, setSnoozeMinutes, setFlashEnabled, setGradualVolume, setAutoVoice,
  } = useSettingsStore();

  const [cmdStopList, setCmdStopList] = useState<string[]>(voiceCommands.stop);
  const [cmdSnoozeList, setCmdSnoozeList] = useState<string[]>(voiceCommands.snooze);
  const [cmdCreateList, setCmdCreateList] = useState<string[]>(voiceCommands.create);

  const user = auth.currentUser;

  useFocusEffect(
    useCallback(() => {
      loadBiometricStatus();
      load();
    }, [])
  );

  useEffect(() => {
    setCmdStopList(voiceCommands.stop);
    setCmdSnoozeList(voiceCommands.snooze);
    setCmdCreateList(voiceCommands.create);
  }, [voiceCommands]);

  async function loadBiometricStatus() {
    try {
      setCheckingBiometric(true);
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricSupported(compatible && enrolled);
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      setBiometricEnabled(snap.exists() && snap.data()?.biometricEnabled === true);
    } catch (e) {
      console.warn("Erro ao carregar biometria:", e);
    } finally {
      setCheckingBiometric(false);
    }
  }

  async function handleSaveCommands() {

    if (cmdStopList.length === 0 || cmdSnoozeList.length === 0 || cmdCreateList.length === 0) {
      Alert.alert("Atenção", "Cada ação precisa ter pelo menos um comando.");
      return;
    }
    await setVoiceCommands({ stop: cmdStopList, snooze: cmdSnoozeList, create: cmdCreateList, autoVoice });
    setEditingCommands(false);
    Alert.alert("✅ Comandos salvos!");
  }

  function addCmd(type: "stop" | "snooze" | "create") {
    const val = newCmd[type].trim();
    if (!val) return;
    if (type === "stop") setCmdStopList((p) => [...p, val]);
    if (type === "snooze") setCmdSnoozeList((p) => [...p, val]);
    if (type === "create") setCmdCreateList((p) => [...p, val]);
    setNewCmd((p) => ({ ...p, [type]: "" }));
  }

  function removeCmd(type: "stop" | "snooze" | "create", index: number) {
    if (type === "stop") setCmdStopList((p) => p.filter((_, i) => i !== index));
    if (type === "snooze") setCmdSnoozeList((p) => p.filter((_, i) => i !== index));
    if (type === "create") setCmdCreateList((p) => p.filter((_, i) => i !== index));
  }

  async function handleEnableBiometric() {
    if (!user) return;
    const savedUid = await AsyncStorage.getItem("@alert:last_uid");
    if (savedUid && savedUid !== user.uid) {
      Alert.alert("Biometria em uso", "Esta digital já está vinculada a outra conta.");
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirme sua digital para vincular",
      cancelLabel: "Cancelar",
    });
    if (!result.success) return;
    try {
      setLoading(true);
      await setDoc(doc(db, "users", user.uid), { biometricEnabled: true }, { merge: true });
      await AsyncStorage.setItem("@alert:last_uid", user.uid);
      setBiometricEnabled(true);
      Alert.alert("✅ Biometria vinculada!");
    } catch (e) {
      Alert.alert("Erro", "Não foi possível vincular a biometria.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisableBiometric() {
    if (!user) return;
    Alert.alert("Desvincular biometria", "Tem certeza?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Desvincular", style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await setDoc(doc(db, "users", user.uid), { biometricEnabled: false }, { merge: true });
            await AsyncStorage.removeItem("@alert:last_uid");
            setBiometricEnabled(false);
          } catch (e) {
            Alert.alert("Erro", "Não foi possível desvincular.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  async function handleLogout() {
    Alert.alert("Sair", "Deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair", style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/(auth)/login" as any);
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>Perfil</Text>

      {/* Info da conta */}
      <View style={styles.card}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={36} color="#6C63FF" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardLabel}>E-mail</Text>
          <Text style={styles.cardValue} numberOfLines={1}>{user?.email ?? "—"}</Text>
        </View>
      </View>

      {/* Biometria */}
      <Text style={styles.sectionTitle}>Segurança</Text>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardRowLeft}>
            <Ionicons name="finger-print-outline" size={24} color={biometricEnabled ? "#6C63FF" : "#888"} />
            <View>
              <Text style={styles.cardValue}>Biometria</Text>
              <Text style={styles.cardLabel}>
                {checkingBiometric ? "Verificando..." : !biometricSupported ? "Não suportado" : biometricEnabled ? "Vinculada" : "Não vinculada"}
              </Text>
            </View>
          </View>
          {checkingBiometric ? <ActivityIndicator color="#6C63FF" /> : biometricSupported && (
            <TouchableOpacity
              style={[styles.toggleBtn, biometricEnabled && styles.toggleBtnDanger]}
              onPress={biometricEnabled ? handleDisableBiometric : handleEnableBiometric}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                <Text style={styles.toggleBtnText}>{biometricEnabled ? "Desvincular" : "Vincular"}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Comandos de voz */}
      <Text style={styles.sectionTitle}>Comandos de Voz</Text>
      <View style={[styles.card, { flexDirection: "column", gap: 16 }]}>

        {(["stop", "snooze", "create"] as const).map((type) => {
          const labels = { stop: "Parar alarme", snooze: "Soneca", create: "Criar alarme" };
          const icons = { stop: "stop-circle-outline", snooze: "time-outline", create: "mic-outline" };
          const colors = { stop: "#ff4444", snooze: "#888", create: "#6C63FF" };
          const list = type === "stop" ? cmdStopList : type === "snooze" ? cmdSnoozeList : cmdCreateList;

          return (
            <View key={type} style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name={icons[type] as any} size={18} color={colors[type]} />
                <Text style={styles.cardValue}>{labels[type]}</Text>
              </View>

              {list.map((cmd, i) => (
                <View key={i} style={styles.cmdChip}>
                  <Text style={styles.cmdChipText}>"{cmd}"</Text>
                  {editingCommands && (
                    <TouchableOpacity onPress={() => removeCmd(type, i)}>
                      <Ionicons name="close-circle" size={16} color="#ff4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {editingCommands && (
                <View style={styles.cmdAddRow}>
                  <TextInput
                    style={styles.commandInput}
                    placeholder="Novo comando..."
                    placeholderTextColor="#555"
                    value={newCmd[type]}
                    onChangeText={(v) => setNewCmd((p) => ({ ...p, [type]: v }))}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.addBtn} onPress={() => addCmd(type)}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {editingCommands ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={[styles.toggleBtn, { flex: 1, alignItems: "center" }]} onPress={handleSaveCommands}>
              <Text style={styles.toggleBtnText}>Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, styles.toggleBtnDanger, { flex: 1, alignItems: "center" }]} onPress={() => setEditingCommands(false)}>
              <Text style={styles.toggleBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.toggleBtn} onPress={() => setEditingCommands(true)}>
            <Text style={styles.toggleBtnText}>Editar comandos</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Configurações do alarme */}
      <Text style={styles.sectionTitle}>Alarme</Text>

      <View style={[styles.card, { flexDirection: "column", gap: 0 }]}>
        <View style={styles.settingRow}>
          <View style={styles.cardRowLeft}>
            <Ionicons name="flash-outline" size={20} color="#888" />
            <View>
              <Text style={styles.cardValue}>Flash no alarme</Text>
              <Text style={styles.cardLabel}>Pisca a lanterna ao disparar</Text>
            </View>
          </View>
          <Switch
            value={flashEnabled}
            onValueChange={setFlashEnabled}
            trackColor={{ false: "#333", true: "#6C63FF" }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: "#2a2a2a" }]}>
          <View style={styles.cardRowLeft}>
            <Ionicons name="volume-medium-outline" size={20} color="#888" />
            <View>
              <Text style={styles.cardValue}>Volume gradual</Text>
              <Text style={styles.cardLabel}>Aumenta o volume aos poucos</Text>
            </View>
          </View>
          <Switch
            value={gradualVolume}
            onValueChange={setGradualVolume}
            trackColor={{ false: "#333", true: "#6C63FF" }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: "#2a2a2a" }]}>
          <View style={styles.cardRowLeft}>
            <Ionicons name="mic-outline" size={20} color="#888" />
            <View>
              <Text style={styles.cardValue}>Voz automática</Text>
              <Text style={styles.cardLabel}>Ouve comandos ao disparar</Text>
            </View>
          </View>
          <Switch
            value={autoVoice}
            onValueChange={setAutoVoice}
            trackColor={{ false: "#333", true: "#6C63FF" }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: "#2a2a2a" }]}>
          <View style={styles.cardRowLeft}>
            <Ionicons name="time-outline" size={20} color="#888" />
            <View>
              <Text style={styles.cardValue}>Tempo de soneca</Text>
              <Text style={styles.cardLabel}>Minutos para adiar o alarme</Text>
            </View>
          </View>
          <View style={styles.minutesPicker}>
            <TouchableOpacity
              onPress={() => setSnoozeMinutes(Math.max(1, snoozeMinutes - 1))}
              style={styles.minutesBtn}
            >
              <Text style={styles.minutesBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.minutesValue}>{snoozeMinutes}</Text>
            <TouchableOpacity
              onPress={() => setSnoozeMinutes(Math.min(30, snoozeMinutes + 1))}
              style={styles.minutesBtn}
            >
              <Text style={styles.minutesBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Logout */}
      <Text style={styles.sectionTitle}>Conta</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ff4444" />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", paddingHorizontal: 20, paddingTop: 60 },
  header: { fontSize: 28, fontWeight: "bold", color: "#fff", marginBottom: 24 },
  sectionTitle: { fontSize: 13, color: "#888", fontWeight: "600", marginBottom: 10, marginTop: 8, textTransform: "uppercase", letterSpacing: 1 },
  card: { backgroundColor: "#1a1a1a", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#2a2a2a", flexDirection: "row", alignItems: "center", gap: 16 },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  cardInfo: { flex: 1, gap: 4 },
  cardRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  cardRowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  cardLabel: { fontSize: 12, color: "#888" },
  cardValue: { fontSize: 15, color: "#fff", fontWeight: "500" },
  toggleBtn: { backgroundColor: "#6C63FF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  toggleBtnDanger: { backgroundColor: "#333", borderWidth: 1, borderColor: "#ff4444" },
  toggleBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1a1a1a", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#2a2a2a" },
  logoutText: { color: "#ff4444", fontSize: 15, fontWeight: "600" },
  commandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  commandLabel: { fontSize: 14, color: "#888", width: 90 },
  commandValue: { fontSize: 14, color: "#6C63FF", flex: 1 },
  commandInput: { flex: 1, backgroundColor: "#2a2a2a", borderRadius: 8, padding: 8, color: "#fff", fontSize: 14 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  minutesPicker: { flexDirection: "row", alignItems: "center", gap: 12 },
  minutesBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  minutesBtnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  minutesValue: { color: "#fff", fontSize: 16, fontWeight: "bold", minWidth: 24, textAlign: "center" },
  cmdChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cmdChipText: { color: "#6C63FF", fontSize: 13 },
  cmdAddRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  addBtn: {
    backgroundColor: "#6C63FF",
    width: 36, height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});