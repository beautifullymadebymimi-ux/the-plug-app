import { Image, Text, View, Pressable, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.topSection}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.foreground }]}>the plug</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Stay connected. Stay plugged in.
          </Text>
        </View>

        <View style={styles.bottomSection}>
          <Text style={[styles.welcomeText, { color: colors.muted }]}>
            Your worship group, all in one place
          </Text>
          <Pressable
            onPress={() => router.push("/auth")}
            style={({ pressed }) => [
              styles.loginButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 60,
  },
  topSection: {
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 28,
    marginBottom: 8,
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: -1,
    textTransform: "lowercase",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  bottomSection: {
    alignItems: "center",
    gap: 20,
  },
  welcomeText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  loginButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
