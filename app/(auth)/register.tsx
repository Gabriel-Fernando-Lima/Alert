import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/src/services/firebase";
import { router } from "expo-router";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!email || !password || !confirm) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Atenção", "As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Atenção", "A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.replace("/(tabs)/alarms" as any);
    } catch (error: any) {
      const msg =
        error.code === "auth/email-already-in-use"
          ? "Este e-mail já está cadastrado."
          : "Erro ao criar conta. Tente novamente.";
      Alert.alert("Erro", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>ALERT</Text>
      <Text style={styles.subtitle}>Crie sua conta</Text>

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        accessibilityLabel="Campo de e-mail"
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        accessibilityLabel="Campo de senha"
      />

      <TextInput
        style={styles.input}
        placeholder="Confirmar senha"
        placeholderTextColor="#888"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        accessibilityLabel="Campo de confirmar senha"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
        accessibilityLabel="Criar conta"
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Criar conta</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        accessibilityLabel="Voltar para login"
      >
        <Text style={styles.link}>Já tem conta? Entrar</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  button: {
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  link: {
    color: "#6C63FF",
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
  },
});