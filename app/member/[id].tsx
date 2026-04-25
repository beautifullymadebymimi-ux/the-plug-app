import { useState, useEffect } from "react";
import { Text, View, Pressable, StyleSheet, ScrollView, TextInput, Platform, Alert, Modal, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

const ROLES = ["Vocalist", "Worship Leader", "Choir Director", "Musician", "Sound Tech", "Media", "Other"];
const INSTRUMENTS = ["Vocals", "Piano/Keys", "Guitar", "Bass", "Drums", "Saxophone", "Trumpet", "Violin", "Flute", "Organ", "Percussion", "Other"];
const VOICE_TYPES = ["Soprano", "Alto", "Tenor", "Baritone", "Bass"];
const INTERESTS = ["Song Writer", "Photography", "Graphics", "Fashion", "Admin", "Production", "Dance", "Acting", "Poetry", "Social Media"];

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { data: member, refetch } = trpc.members.byId.useQuery({ id: Number(id) });

  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editInstrument, setEditInstrument] = useState("");
  const [editVoiceType, setEditVoiceType] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [editImage, setEditImage] = useState<{ base64: string; mimeType: string; uri: string } | null>(null);

  const deleteMutation = trpc.members.delete.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Deleted", "Member profile has been removed.");
      router.back();
    },
    onError: () => {
      Alert.alert("Error", "Could not delete profile. Please try again.");
    },
  });

  const handleDelete = () => {
    if (Platform.OS === "web") {
      setShowDeleteConfirm(true);
    } else {
      Alert.alert(
        "Delete Member",
        `Are you sure you want to permanently delete ${member?.name || "this member"}'s profile?\n\nThis action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              deleteMutation.mutate({ id: Number(id) });
            },
          },
        ]
      );
    }
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    deleteMutation.mutate({ id: Number(id) });
  };

  const handleDeleteWeb = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Are you sure you want to permanently delete ${member?.name || "this member"}? This cannot be undone.`
      );
      if (!confirmed) return;
      deleteMutation.mutate({ id: Number(id) });
      return;
    }

    handleDelete();
  };

  const updateMutation = trpc.members.update.useMutation({
    onSuccess: () => {
      refetch();
      setShowEdit(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Updated", "Profile has been updated.");
    },
    onError: () => {
      Alert.alert("Error", "Could not update profile. Please try again.");
    },
  });

  useEffect(() => {
    if (member && showEdit) {
      setEditName(member.name || "");
      setEditRole(member.role || "");
      setEditInstrument(member.instrument || "");
      setEditVoiceType((member as any).voiceType || "");
      setEditPhone(member.phone || "");
      setEditBio(member.bio || "");
      const interestsStr = (member as any).interests || "";
      setEditInterests(interestsStr ? interestsStr.split(", ").filter(Boolean) : []);
      setEditImage(null);
    }
  }, [member, showEdit]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setEditImage({
          base64: asset.base64,
          mimeType: asset.mimeType || "image/jpeg",
          uri: asset.uri,
        });
      }
    }
  };

  const toggleInterest = (interest: string) => {
    setEditInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    if (!editName.trim()) {
      Alert.alert("Required", "Name cannot be empty.");
      return;
    }
    updateMutation.mutate({
      id: Number(id),
      name: editName.trim(),
      role: editRole || undefined,
      instrument: editInstrument || undefined,
      voiceType: editRole === "Vocalist" ? (editVoiceType || undefined) : undefined,
      interests: editInterests.length > 0 ? editInterests.join(", ") : undefined,
      phone: editPhone.trim() || undefined,
      bio: editBio.trim() || undefined,
      profileImageBase64: editImage?.base64 || undefined,
      profileImageMimeType: editImage?.mimeType || undefined,
    });
  };

  const avatarColors = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#EF4444"];
  const getAvatarColor = (memberId: number) => avatarColors[memberId % avatarColors.length];

  if (!member) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const memberInterests = ((member as any).interests || "").split(", ").filter(Boolean);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, { backgroundColor: colors.surface }, pressed && { opacity: 0.7 }]}>
          <IconSymbol name="arrow.left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Member</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={handleDeleteWeb}
            disabled={deleteMutation.isPending}
            style={({ pressed }) => [styles.editButton, { backgroundColor: colors.error }, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
          >
            <IconSymbol name="trash.fill" size={16} color="#FFF" />
          </Pressable>
          <Pressable
            onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowEdit(true); }}
            style={({ pressed }) => [styles.editButton, { backgroundColor: colors.primary }, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
          >
            <IconSymbol name="pencil" size={16} color="#FFF" />
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {(member as any).profileImageUrl ? (
            <Image source={{ uri: (member as any).profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: getAvatarColor(member.id) }]}>
              <Text style={styles.avatarText}>
                {(member.name || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
              </Text>
            </View>
          )}
          <Text style={[styles.memberName, { color: colors.foreground }]}>{member.name}</Text>
          <View style={styles.badgeRow}>
            {member.role && (
              <View style={[styles.roleBadge, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.roleText, { color: colors.primary }]}>{member.role}</Text>
              </View>
            )}
            {(member as any).voiceType && (
              <View style={[styles.roleBadge, { backgroundColor: "#8B5CF620" }]}>
                <Text style={[styles.roleText, { color: "#8B5CF6" }]}>{(member as any).voiceType}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(member as any).voiceType && (
            <View style={styles.infoRow}>
              <IconSymbol name="music.note" size={18} color={"#8B5CF6"} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Voice Type</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{(member as any).voiceType}</Text>
              </View>
            </View>
          )}
          {(member as any).voiceType && member.instrument && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
          {member.instrument && (
            <View style={styles.infoRow}>
              <IconSymbol name="music.note" size={18} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Instrument / Skill</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{member.instrument}</Text>
              </View>
            </View>
          )}
          {member.phone && (
            <>
              {(member.instrument || (member as any).voiceType) && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={styles.infoRow}>
                <IconSymbol name="person.fill" size={18} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.muted }]}>Phone</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{member.phone}</Text>
                </View>
              </View>
            </>
          )}
          {!(member as any).voiceType && !member.instrument && !member.phone && (
            <View style={styles.infoRow}>
              <IconSymbol name="person.fill" size={18} color={colors.muted} />
              <Text style={[styles.infoLabel, { color: colors.muted }]}>No additional info provided</Text>
            </View>
          )}
        </View>

        {/* Interests */}
        {memberInterests.length > 0 && (
          <View style={[styles.interestsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Other Interests</Text>
            <View style={styles.interestsGrid}>
              {memberInterests.map((interest: string) => (
                <View key={interest} style={[styles.interestBadge, { backgroundColor: "#F59E0B20" }]}>
                  <Text style={[styles.interestText, { color: "#F59E0B" }]}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bio */}
        {member.bio && (
          <View style={[styles.bioCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
            <Text style={[styles.bioText, { color: colors.muted }]}>{member.bio}</Text>
          </View>
        )}

        {/* Joined date */}
        <Text style={[styles.joinedText, { color: colors.muted }]}>
          Joined {new Date(member.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </Text>
      </ScrollView>

      {/* Delete Confirmation Modal (web-compatible) */}
      <Modal visible={showDeleteConfirm} animationType="fade" transparent>
        <View style={[styles.modalOverlay, { justifyContent: "center" }]}>
          <View style={[styles.deleteModalContent, { backgroundColor: colors.background }]}>
            <IconSymbol name="trash.fill" size={32} color={colors.error} />
            <Text style={[styles.deleteModalTitle, { color: colors.foreground }]}>Delete Member</Text>
            <Text style={[styles.deleteModalText, { color: colors.muted }]}>
              Are you sure you want to permanently delete {member?.name || "this member"}'s profile?{"\n\n"}This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <Pressable
                onPress={() => setShowDeleteConfirm(false)}
                style={({ pressed }) => [styles.deleteModalCancelBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.deleteModalCancelText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                disabled={deleteMutation.isPending}
                style={({ pressed }) => [styles.deleteModalDeleteBtn, { backgroundColor: colors.error }, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
              >
                <Text style={styles.deleteModalDeleteText}>{deleteMutation.isPending ? "Deleting..." : "Delete"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowEdit(false)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                <Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Profile</Text>
              <Pressable
                onPress={handleSave}
                disabled={!editName.trim() || updateMutation.isPending}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.modalSave, { color: editName.trim() ? colors.primary : colors.muted }]}>
                  {updateMutation.isPending ? "..." : "Save"}
                </Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Profile Image */}
              <View style={[styles.formGroup, { alignItems: "center" }]}>
                <Pressable onPress={pickImage} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
                  {editImage ? (
                    <Image source={{ uri: editImage.uri }} style={styles.profileImagePreview} />
                  ) : (member as any).profileImageUrl ? (
                    <Image source={{ uri: (member as any).profileImageUrl }} style={styles.profileImagePreview} />
                  ) : (
                    <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <IconSymbol name="camera.fill" size={28} color={colors.muted} />
                      <Text style={[{ fontSize: 12, fontWeight: "600" }, { color: colors.muted }]}>Change Photo</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable onPress={pickImage} style={({ pressed }) => [{ marginTop: 8 }, pressed && { opacity: 0.6 }]}>
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>
                    {(member as any).profileImageUrl || editImage ? "Change Photo" : "Add Photo"}
                  </Text>
                </Pressable>
              </View>

              {/* Name */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Name *</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Full name"
                  placeholderTextColor={colors.muted}
                  style={[styles.formInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                />
              </View>

              {/* Role */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Role</Text>
                <View style={styles.chipGrid}>
                  {ROLES.map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => {
                        setEditRole(editRole === r ? "" : r);
                        if (r !== "Vocalist" && editRole !== r) setEditVoiceType("");
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={({ pressed }) => [
                        styles.chip,
                        { borderColor: editRole === r ? colors.primary : colors.border, backgroundColor: editRole === r ? colors.primary + "20" : colors.surface },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: editRole === r ? colors.primary : colors.foreground }]}>{r}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Voice Type — only for Vocalist */}
              {editRole === "Vocalist" && (
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.muted }]}>Voice Type</Text>
                  <View style={styles.chipGrid}>
                    {VOICE_TYPES.map((v) => (
                      <Pressable
                        key={v}
                        onPress={() => {
                          setEditVoiceType(editVoiceType === v ? "" : v);
                          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={({ pressed }) => [
                          styles.chip,
                          { borderColor: editVoiceType === v ? "#8B5CF6" : colors.border, backgroundColor: editVoiceType === v ? "#8B5CF620" : colors.surface },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: editVoiceType === v ? "#8B5CF6" : colors.foreground }]}>{v}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Instrument */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Instrument / Skill</Text>
                <View style={styles.chipGrid}>
                  {INSTRUMENTS.map((i) => (
                    <Pressable
                      key={i}
                      onPress={() => {
                        setEditInstrument(editInstrument === i ? "" : i);
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={({ pressed }) => [
                        styles.chip,
                        { borderColor: editInstrument === i ? colors.primary : colors.border, backgroundColor: editInstrument === i ? colors.primary + "20" : colors.surface },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: editInstrument === i ? colors.primary : colors.foreground }]}>{i}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Other Interests */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Other Interests</Text>
                <View style={styles.chipGrid}>
                  {INTERESTS.map((interest) => {
                    const isSelected = editInterests.includes(interest);
                    return (
                      <Pressable
                        key={interest}
                        onPress={() => toggleInterest(interest)}
                        style={({ pressed }) => [
                          styles.chip,
                          { borderColor: isSelected ? "#F59E0B" : colors.border, backgroundColor: isSelected ? "#F59E0B20" : colors.surface },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: isSelected ? "#F59E0B" : colors.foreground }]}>{interest}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Phone */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Phone Number</Text>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="(optional)"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  style={[styles.formInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                />
              </View>

              {/* Bio */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Bio</Text>
                <TextInput
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Tell us about yourself... (optional)"
                  placeholderTextColor={colors.muted}
                  multiline
                  style={[styles.formTextArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                />
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16 },
  navBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  navTitle: { fontSize: 17, fontWeight: "600" },
  editButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  editButtonText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
  profileHeader: { alignItems: "center", gap: 12, paddingVertical: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center" },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarText: { color: "#FFF", fontSize: 36, fontWeight: "700" },
  memberName: { fontSize: 26, fontWeight: "800" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  roleBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12 },
  roleText: { fontSize: 14, fontWeight: "700" },
  infoCard: { padding: 16, borderRadius: 16, borderWidth: 1 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10 },
  infoContent: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 12, fontWeight: "600" },
  infoValue: { fontSize: 15, fontWeight: "500" },
  divider: { height: 1, marginLeft: 32 },
  // Interests
  interestsCard: { padding: 20, borderRadius: 16, borderWidth: 1, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  interestsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  interestBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  interestText: { fontSize: 13, fontWeight: "600" },
  bioCard: { padding: 20, borderRadius: 16, borderWidth: 1, gap: 8 },
  bioText: { fontSize: 15, lineHeight: 22 },
  joinedText: { fontSize: 13, textAlign: "center", marginTop: 8 },
  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 24, paddingBottom: 40, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalCancel: { fontSize: 16 },
  modalSave: { fontSize: 16, fontWeight: "700" },
  formScroll: { paddingBottom: 20 },
  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 13, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 },
  formInput: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  formTextArea: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 16, minHeight: 80, textAlignVertical: "top" },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontWeight: "600" },
  // Profile image
  profileImagePreview: { width: 100, height: 100, borderRadius: 50 },
  profileImagePlaceholder: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderStyle: "dashed", justifyContent: "center", alignItems: "center", gap: 4 },
  // Delete confirmation modal
  deleteModalContent: { borderRadius: 20, padding: 28, alignItems: "center", gap: 12, marginHorizontal: 24, marginBottom: 100, alignSelf: "center", width: "90%", maxWidth: 360 },
  deleteModalTitle: { fontSize: 20, fontWeight: "800" },
  deleteModalText: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  deleteModalButtons: { flexDirection: "row", gap: 12, marginTop: 8, width: "100%" },
  deleteModalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  deleteModalCancelText: { fontSize: 16, fontWeight: "600" },
  deleteModalDeleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  deleteModalDeleteText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
