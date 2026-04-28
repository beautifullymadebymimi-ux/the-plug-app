import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Image } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { Auth } from "@/lib/auth";
import { Auth } from "@/lib/auth";

export default function AuthScreen() {
  const colors = useColors();
  const utils = trpc.useUtils();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: async () => {
      if (data.sessionToken) {
        await Auth.setSessionToken(data.sessionToken);
      }

      if (data.sessionToken) {
        await Auth.setSessionToken(data.sessionToken);
      }

      await utils.auth.me.invalidate();
      router.replace("/(tabs)/portal");
    },
    onError: (err) => {
      Alert.alert("Sign up failed", err.message || "Could not sign up.");
    },
  });

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not log in.");
      }

      if (data.sessionToken) {
        await Auth.setSessionToken(data.sessionToken);
      }

      if (data.sessionToken) {
        await Auth.setSessionToken(data.sessionToken);
      }

      await utils.auth.me.invalidate();
      router.replace("/(tabs)/portal");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not log in.";
      Alert.alert("Login failed", message);
    } finally {
      setLoginLoading(false);
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

  const isLoading = loginLoading || signupMutation.isPending;

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.logoWrap}>
            <Image source={require("@/assets/images/icon.png")} style={styles.logo} />
          </View>

          <Text style={[styles.brandKicker, { color: colors.primary }]}>THE PLUG</Text>

          <Text style={[styles.title, { color: colors.foreground }]}>
            {mode === "login" ? "Welcome back." : "Get plugged in."}
          </Text>

          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {mode === "login"
              ? "Sign in to access your member portal, updates, songs, and community."
              : "Create your member account and stay connected with The Plug."}
          </Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.modeSwitch, { backgroundColor: colors.background }]}>
            <Pressable
              onPress={() => setMode("login")}
              style={[
                styles.modeButton,
                mode === "login" && { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[styles.modeText, { color: mode === "login" ? "#FFF" : colors.muted }]}>
                Log In
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode("signup")}
              style={[
                styles.modeButton,
                mode === "signup" && { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[styles.modeText, { color: mode === "signup" ? "#FFF" : colors.muted }]}>
                Sign Up
              </Text>
            </Pressable>
          </View>

          {mode === "signup" && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.muted }]}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Melissa Cole"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
                ]}
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.muted }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.input,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.muted }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={[
                styles.input,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.86, transform: [{ scale: 0.98 }] },
              isLoading && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Please wait..." : mode === "login" ? "Enter Portal" : "Create Account"}
            </Text>
          </Pressable>

          <Text style={[styles.footerNote, { color: colors.muted }]}>
            {mode === "login"
              ? "Members only. Use the email connected to your Plug account."
              : "After signing up, your account will connect to the member portal."}
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: "center",
    gap: 18,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 30,
    padding: 22,
    alignItems: "center",
  },
  logoWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 14,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  brandKicker: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 330,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 30,
    padding: 18,
    gap: 14,
  },
  modeSwitch: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 4,
    marginBottom: 2,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 999,
    alignItems: "center",
  },
  modeText: {
    fontSize: 14,
    fontWeight: "850",
  },
  fieldGroup: {
    gap: 7,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingLeft: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "850",
  },
  footerNote: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 10,
  },
});