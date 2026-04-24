import { useState, useMemo } from "react";
import { FlatList, Text, View, Pressable, StyleSheet, Modal, TextInput, ScrollView, Platform, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
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
const FILTER_CHIPS = ["All", "Vocalist", "Musician", "Worship Leader", "Choir Director", "Sound Tech", "Media"];

export default function MembersScreen() {
  const colors = useColors();
  const router = useRouter();
  const { data: members, refetch } = trpc.members.list.useQuery();

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  // Signup form state
  const [showSignup, setShowSignup] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupRole, setSignupRole] = useState("");
  const [signupInstrument, setSignupInstrument] = useState("");
  const [signupVoiceType, setSignupVoiceType] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupBio, setSignupBio] = useState("");
  const [signupInterests, setSignupInterests] = useState<string[]>([]);
  const [signupImage, setSignupImage] = useState<{ base64: string; mimeType: string; uri: string } | null>(null);

  const signupMutation = trpc.members.signup.useMutation({
    onSuccess: () => {
      refetch();
      setShowSignup(false);
      resetForm();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Welcome!", "You've been added to The Plug! You can now participate in group chat.");
    },
    onError: () => {
      Alert.alert("Error", "Could not sign up. Please try again.");
    },
  });

  const resetForm = () => {
    setSignupName("");
    setSignupRole("");
    setSignupInstrument("");
    setSignupVoiceType("");
    setSignupPhone("");
    setSignupBio("");
    setSignupInterests([]);
    setSignupImage(null);
  };

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
        setSignupImage({
          base64: asset.base64,
          mimeType: asset.mimeType || "image/jpeg",
          uri: asset.uri,
        });
      }
    }
  };

  const toggleInterest = (interest: string) => {
    setSignupInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSignup = () => {
    if (!signupName.trim()) {
      Alert.alert("Required", "Please enter your name.");
      return;
    }
    signupMutation.mutate({
      name: signupName.trim(),
      role: signupRole || undefined,
      instrument: signupInstrument || undefined,
      voiceType: signupRole === "Vocalist" ? (signupVoiceType || undefined) : undefined,
      interests: signupInterests.length > 0 ? signupInterests.join(", ") : undefined,
      phone: signupPhone.trim() || undefined,
      bio: signupBio.trim() || undefined,
      profileImageBase64: signupImage?.base64 || undefined,
      profileImageMimeType: signupImage?.mimeType || undefined,
    });
  };

  // Filtered members
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    let result = members;

    if (activeFilter !== "All") {
      result = result.filter((m) => m.role === activeFilter);
    }

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter((m) => {
        const name = (m.name || "").toLowerCase();
        const role = (m.role || "").toLowerCase();
        const instrument = (m.instrument || "").toLowerCase();
        const voiceType = ((m as any).voiceType || "").toLowerCase();
        const interests = ((m as any).interests || "").toLowerCase();
        return name.includes(q) || role.includes(q) || instrument.includes(q) || voiceType.includes(q) || interests.includes(q);
      });
    }

    return result;
  }, [members, searchQuery, activeFilter]);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const avatarColors = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#EF4444"];
  const getAvatarColor = (id: number) => avatarColors[id % avatarColors.length];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Members</Text>
          <Text style={[styles.count, { color: colors.muted }]}>{members?.length || 0} members</Text>
        </View>
        <Pressable
          onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSignup(true); }}
          style={({ pressed }) => [styles.signupButton, { backgroundColor: colors.primary }, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
        >
          <IconSymbol name="person.badge.plus" size={18} color="#FFF" />
          <Text style={styles.signupButtonText}>Join</Text>
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, role, or instrument..."
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
              <IconSymbol name="xmark" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilter === chip;
          return (
            <Pressable
              key={chip}
              onPress={() => {
                setActiveFilter(chip);
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.filterChipText, { color: isActive ? "#FFF" : colors.foreground }]}>{chip}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Results count when filtering */}
      {(searchQuery || activeFilter !== "All") && (
        <View style={styles.resultsRow}>
          <Text style={[styles.resultsText, { color: colors.muted }]}>
            {filteredMembers.length} {filteredMembers.length === 1 ? "result" : "results"}
            {activeFilter !== "All" ? ` for "${activeFilter}"` : ""}
            {searchQuery ? ` matching "${searchQuery}"` : ""}
          </Text>
        </View>
      )}

      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="person.2.fill" size={48} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {searchQuery || activeFilter !== "All" ? "No matches found" : "No members yet"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              {searchQuery || activeFilter !== "All" ? "Try a different search or filter" : "Tap \"Join\" to sign up as a member"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/member/${item.id}` as any)}
            style={({ pressed }) => [styles.memberCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
          >
            {(item as any).profileImageUrl ? (
              <Image source={{ uri: (item as any).profileImageUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.id) }]}>
                <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
              </View>
            )}
            <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.role && (
              <Text style={[styles.memberRole, { color: colors.primary }]} numberOfLines={1}>
                {item.role}
              </Text>
            )}
            {(item as any).voiceType && (
              <Text style={[styles.memberVoiceType, { color: "#8B5CF6" }]} numberOfLines={1}>
                {(item as any).voiceType}
              </Text>
            )}
            {item.instrument && (
              <Text style={[styles.memberInstrument, { color: colors.muted }]} numberOfLines={1}>
                {item.instrument}
              </Text>
            )}
          </Pressable>
        )}
      />

      {/* Signup Modal */}
      <Modal visible={showSignup} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => { setShowSignup(false); resetForm(); }} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                <Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Join The Plug</Text>
              <Pressable
                onPress={handleSignup}
                disabled={!signupName.trim() || signupMutation.isPending}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.modalSave, { color: signupName.trim() ? colors.primary : colors.muted }]}>
                  {signupMutation.isPending ? "..." : "Join"}
                </Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Profile Image */}
              <View style={[styles.formGroup, { alignItems: "center" }]}>
                <Pressable
                  onPress={pickImage}
                  style={({ pressed }) => [pressed && { opacity: 0.8 }]}
                >
                  {signupImage ? (
                    <Image source={{ uri: signupImage.uri }} style={styles.profileImagePreview} />
                  ) : (
                    <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <IconSymbol name="camera.fill" size={28} color={colors.muted} />
                      <Text style={[styles.profileImageLabel, { color: colors.muted }]}>Add Photo</Text>
                    </View>
                  )}
                </Pressable>
                {signupImage && (
                  <Pressable onPress={() => setSignupImage(null)} style={({ pressed }) => [{ marginTop: 8 }, pressed && { opacity: 0.6 }]}>
                    <Text style={{ color: colors.error, fontSize: 13, fontWeight: "600" }}>Remove Photo</Text>
                  </Pressable>
                )}
              </View>

              {/* Name */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Your Name *</Text>
                <TextInput
                  value={signupName}
                  onChangeText={setSignupName}
                  placeholder="Full name"
                  placeholderTextColor={colors.muted}
                  style={[styles.formInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                />
              </View>

              {/* Role */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Your Role</Text>
                <View style={styles.chipGrid}>
                  {ROLES.map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => {
                        setSignupRole(signupRole === r ? "" : r);
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={({ pressed }) => [
                        styles.chip,
                        { borderColor: signupRole === r ? colors.primary : colors.border, backgroundColor: signupRole === r ? colors.primary + "20" : colors.surface },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: signupRole === r ? colors.primary : colors.foreground }]}>{r}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Voice Type — only shown when Vocalist is selected */}
              {signupRole === "Vocalist" && (
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.muted }]}>Voice Type</Text>
                  <View style={styles.chipGrid}>
                    {VOICE_TYPES.map((v) => (
                      <Pressable
                        key={v}
                        onPress={() => {
                          setSignupVoiceType(signupVoiceType === v ? "" : v);
                          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={({ pressed }) => [
                          styles.chip,
                          { borderColor: signupVoiceType === v ? "#8B5CF6" : colors.border, backgroundColor: signupVoiceType === v ? "#8B5CF620" : colors.surface },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: signupVoiceType === v ? "#8B5CF6" : colors.foreground }]}>{v}</Text>
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
                        setSignupInstrument(signupInstrument === i ? "" : i);
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={({ pressed }) => [
                        styles.chip,
                        { borderColor: signupInstrument === i ? colors.primary : colors.border, backgroundColor: signupInstrument === i ? colors.primary + "20" : colors.surface },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: signupInstrument === i ? colors.primary : colors.foreground }]}>{i}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Other Interests */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Other Interests</Text>
                <View style={styles.chipGrid}>
                  {INTERESTS.map((interest) => {
                    const isSelected = signupInterests.includes(interest);
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
                  value={signupPhone}
                  onChangeText={setSignupPhone}
                  placeholder="(optional)"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  style={[styles.formInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                />
              </View>

              {/* Bio */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Short Bio</Text>
                <TextInput
                  value={signupBio}
                  onChangeText={setSignupBio}
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 32, fontWeight: "800" },
  count: { fontSize: 14, fontWeight: "500", marginTop: 2 },
  signupButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
  signupButtonText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  // Search
  searchContainer: { paddingHorizontal: 20, paddingBottom: 8 },
  searchBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  // Filters
  filterScroll: { maxHeight: 44 },
  filterRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: "600" },
  // Results
  resultsRow: { paddingHorizontal: 20, paddingBottom: 8 },
  resultsText: { fontSize: 13 },
  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  columnWrapper: { gap: 12 },
  memberCard: { flex: 1, padding: 20, borderRadius: 16, borderWidth: 1, alignItems: "center", gap: 6 },
  avatar: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center" },
  avatarImage: { width: 60, height: 60, borderRadius: 30 },
  avatarText: { color: "#FFF", fontSize: 22, fontWeight: "700" },
  memberName: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  memberRole: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  memberVoiceType: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  memberInstrument: { fontSize: 11, textAlign: "center" },
  emptyState: { padding: 48, borderRadius: 20, borderWidth: 1, alignItems: "center", gap: 8, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
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
  profileImageLabel: { fontSize: 12, fontWeight: "600" },
});
