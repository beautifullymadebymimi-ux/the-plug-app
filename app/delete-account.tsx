import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import * as Auth from "@/lib/_core/auth";

export default function DeleteAccountScreen() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const [confirmText, setConfirmText] = useState("");

  const deleteMutation = trpc.account.deleteMyAccount.useMutation({
    onSuccess: async () => {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      await utils.invalidate();

      Alert.alert("Account Deleted", "Your account has been deleted.", [
        { text: "OK", onPress: () => router.replace("/auth" as any) },
      ]);
    },
    onError: (err) => {
      Alert.alert("Delete Failed", err.message || "Could not delete your account.");
    },
  });

  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  const confirmDelete = () => {
    if (!canDelete) {
      Alert.alert("Confirmation Required", "Type DELETE to confirm account deletion.");
      return;
    }

    Alert.alert(
      "Delete Account",
      "This will delete your account and remove your access to The Plug Worship. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </Pressable>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.kicker, { color: colors.primary }]}>ACCOUNT</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Delete My Account</Text>

          <Text style={[styles.body, { color: colors.muted }]}>
            You can permanently delete your The Plug Worship account. This removes your app account access
            and associated account information where possible.
          </Text>

          <Text style={[styles.warning, { color: colors.error }]}>
            This action cannot be undone.
          </Text>

          <Text style={[styles.label, { color: colors.foreground }]}>
            Type DELETE to confirm:
          </Text>

          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            placeholder="DELETE"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
          />

          <Pressable
            disabled={!canDelete || deleteMutation.isPending}
            onPress={confirmDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              {
                backgroundColor: canDelete ? colors.error : colors.muted,
                opacity: !canDelete || deleteMutation.isPending ? 0.55 : 1,
              },
              pressed && canDelete && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.deleteButtonText}>
              {deleteMutation.isPending ? "Deleting..." : "Delete My Account"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 18,
  },
  backText: {
    fontSize: 16,
    fontWeight: "900",
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "950",
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 30,
    fontWeight: "950",
    lineHeight: 34,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
  warning: {
    fontSize: 14,
    fontWeight: "950",
  },
  label: {
    fontSize: 14,
    fontWeight: "900",
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "900",
  },
  deleteButton: {
    marginTop: 6,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "950",
  },
});
