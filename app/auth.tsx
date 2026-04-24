import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function AuthScreen() {
  const colors = useColors();
  const utils = trpc.useUtils();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      router.replace("/(tabs)/portal");
    },
    onError: (err) => {
      Alert.alert("Sign up failed", err.message || "Could not sign up.");
    },
  });

  const handleLogin = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not log in.");
      }

      await utils.auth.me.invalidate();
      router.replace("/(tabs)/portal");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not log in.";
      Alert.alert("Login failed", message);
    }
  };

  const handleSubmit = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing info", "Email and password are required.");
      return;
    }

    if (mode === "signup") {
      if (!name.trim()) {
        Alert.alert("Missing info", "Name is required for sign up.");
        return;
      }

      signupMutation.mutate({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      return;
    }

    handleLogin();
  };

const isLoading = signupMutation.isPending;
  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {mode === "login" ? "Member Login" : "Create Account"}
        </Text>

        {mode === "signup" && (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
          />
        )}

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
        />

        <Pressable
          onPress={handleSubmit}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Please wait..." : mode === "login" ? "Log In" : "Sign Up"}
          </Text>
        </Pressable>

        <Pressable onPress={() => setMode(mode === "login" ? "signup" : "login")}>
          <Text style={[styles.switchText, { color: colors.primary }]}>
            {mode === "login"
              ? "Need an account? Sign up"
              : "Already have an account? Log in"}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  switchText: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 15,
    fontWeight: "600",
  },
});

