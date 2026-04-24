import { useState } from "react";
import { Text, View, Pressable, StyleSheet, ScrollView, TextInput, Alert, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";

export default function DevotionalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { data: devotional, refetch } = trpc.devotionals.byId.useQuery({ id: Number(id) }, { enabled: !!id });

  const updateMutation = trpc.devotionals.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditing(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => Alert.alert("Error", "Could not update the devotional."),
  });
  const deleteMutation = trpc.devotionals.delete.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: () => Alert.alert("Error", "Could not delete the devotional."),
  });

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editScriptureRef, setEditScriptureRef] = useState("");
  const [editScripture, setEditScripture] = useState("");
  const [editContent, setEditContent] = useState("");

  const startEditing = () => {
    if (!devotional) return;
    setEditTitle(devotional.title);
    setEditScriptureRef(devotional.scriptureReference || "");
    setEditScripture(devotional.scripture || "");
    setEditContent(devotional.content);
    setEditing(true);
  };

  const handleSave = () => {
    if (!editTitle.trim() || !editContent.trim()) {
      Alert.alert("Required", "Title and content are required.");
      return;
    }
    updateMutation.mutate({
      id: Number(id),
      title: editTitle.trim(),
      scriptureReference: editScriptureRef.trim() || undefined,
      scripture: editScripture.trim() || undefined,
      content: editContent.trim(),
    });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Devotional",
      "Are you sure you want to delete this devotional? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate({ id: Number(id) }) },
      ]
    );
  };

  if (!devotional) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // ---- Edit Mode ----
  if (editing) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.navBar}>
          <Pressable onPress={() => setEditing(false)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Edit Devotional</Text>
          <Pressable
            onPress={handleSave}
            disabled={updateMutation.isPending}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.saveText, { color: editTitle.trim() && editContent.trim() ? colors.primary : colors.muted }]}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.editContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.muted }]}>Title *</Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Devotional title"
              placeholderTextColor={colors.muted}
              style={[styles.formInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
            />
          </View>

          {/* Scripture Reference */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.muted }]}>Scripture Reference</Text>
            <TextInput
              value={editScriptureRef}
              onChangeText={setEditScriptureRef}
              placeholder="e.g. John 3:16"
              placeholderTextColor={colors.muted}
              style={[styles.formInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
            />
          </View>

          {/* Scripture Text */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.muted }]}>Scripture Text</Text>
            <TextInput
              value={editScripture}
              onChangeText={setEditScripture}
              placeholder="Paste the scripture verse here..."
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.formTextArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
            />
          </View>

          {/* Content / Reflection */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.muted }]}>Reflection / Content *</Text>
            <TextInput
              value={editContent}
              onChangeText={setEditContent}
              placeholder="Write your reflection..."
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.formTextAreaLarge, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
            />
          </View>

          {/* Delete Button */}
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.deleteButton, { backgroundColor: colors.error + "15", borderColor: colors.error + "40" }, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="trash" size={18} color={colors.error} />
            <Text style={[styles.deleteText, { color: colors.error }]}>Delete Devotional</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ---- View Mode ----
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, { backgroundColor: colors.surface }, pressed && { opacity: 0.7 }]}>
          <IconSymbol name="arrow.left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Devotional</Text>
        <Pressable
          onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); startEditing(); }}
          style={({ pressed }) => [styles.editButton, { backgroundColor: colors.primary }, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Date */}
        <Text style={[styles.date, { color: colors.muted }]}>
          {new Date(devotional.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </Text>

        {/* Title */}
        <Text style={[styles.title, { color: colors.foreground }]}>{devotional.title}</Text>

        {/* Scripture Reference */}
        {devotional.scriptureReference && (
          <View style={[styles.scriptureRefCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
            <IconSymbol name="book.fill" size={18} color={colors.primary} />
            <Text style={[styles.scriptureRef, { color: colors.primary }]}>{devotional.scriptureReference}</Text>
          </View>
        )}

        {/* Scripture Text */}
        {devotional.scripture && (
          <View style={[styles.scriptureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.scriptureText, { color: colors.foreground }]}>"{devotional.scripture}"</Text>
          </View>
        )}

        {/* Content */}
        <Text style={[styles.contentText, { color: colors.foreground }]}>{devotional.content}</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16 },
  navBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  navTitle: { fontSize: 17, fontWeight: "600" },
  editButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  editButtonText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  cancelText: { fontSize: 16 },
  saveText: { fontSize: 16, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  editContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
  date: { fontSize: 14, fontWeight: "500" },
  title: { fontSize: 28, fontWeight: "800", lineHeight: 34 },
  scriptureRefCard: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, gap: 8 },
  scriptureRef: { fontSize: 15, fontWeight: "700" },
  scriptureCard: { padding: 20, borderRadius: 16, borderWidth: 1, borderLeftWidth: 4 },
  scriptureText: { fontSize: 16, lineHeight: 26, fontStyle: "italic" },
  contentText: { fontSize: 16, lineHeight: 26 },
  // Edit form
  formGroup: { gap: 6 },
  formLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  formInput: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  formTextArea: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 16, minHeight: 100, textAlignVertical: "top" },
  formTextAreaLarge: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 16, minHeight: 180, textAlignVertical: "top" },
  deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 14, borderWidth: 1, gap: 8, marginTop: 12 },
  deleteText: { fontSize: 15, fontWeight: "700" },
});
