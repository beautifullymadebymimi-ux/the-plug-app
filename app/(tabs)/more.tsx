import { useState, useCallback, useEffect } from "react";
import { ScrollView, Text, View, Pressable, StyleSheet, FlatList, TextInput, Image, Platform, Modal, Alert, ActivityIndicator, Linking, Switch } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { notifyNewDevotional } from "@/lib/notifications";
import { useThemeContext } from "@/lib/theme-provider";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CHAT_MEMBER_KEY = "the_plug_chat_member_id";

type Section = "menu" | "media" | "devotionals" | "chat" | "about" | "drive" | "popl" | "suggestions";

const SUGGESTION_CATEGORIES = [
  { key: "song" as const, label: "Song", color: "#8B5CF6" },
  { key: "venue" as const, label: "Venue", color: "#3B82F6" },
  { key: "event" as const, label: "Event", color: "#10B981" },
  { key: "general" as const, label: "General", color: "#F59E0B" },
];

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();
  const { colorScheme, setColorScheme } = useThemeContext();
  const isDark = colorScheme === "dark";
  const [section, setSection] = useState<Section>("menu");
  const [chatInput, setChatInput] = useState("");

  // Chat member identity
  const [chatMemberId, setChatMemberId] = useState<number | null>(null);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [loadingIdentity, setLoadingIdentity] = useState(true);

  // Devotional form state
  const [showDevotionalForm, setShowDevotionalForm] = useState(false);
  const [devTitle, setDevTitle] = useState("");
  const [devScripture, setDevScripture] = useState("");
  const [devScriptureRef, setDevScriptureRef] = useState("");
  const [devContent, setDevContent] = useState("");

  // Media upload state
  const [uploading, setUploading] = useState(false);

  // Suggestion board state
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [sugTitle, setSugTitle] = useState("");
  const [sugDescription, setSugDescription] = useState("");
  const [sugCategory, setSugCategory] = useState<"song" | "venue" | "event" | "general">("general");
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState("");

  const { data: membersList } = trpc.members.list.useQuery();
  const { data: suggestionsList, refetch: refetchSuggestions } = trpc.suggestions.list.useQuery(undefined, { enabled: section === "suggestions" });
  const createSuggestion = trpc.suggestions.create.useMutation({
    onSuccess: () => {
      refetchSuggestions();
      setShowSuggestionForm(false);
      setSugTitle("");
      setSugDescription("");
      setSugCategory("general");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      Alert.alert("Error", "Could not post suggestion. Please try again.");
    },
  });
  const likeSuggestion = trpc.suggestions.like.useMutation({
    onSuccess: () => refetchSuggestions(),
  });
  const deleteSuggestion = trpc.suggestions.delete.useMutation({
    onSuccess: () => {
      refetchSuggestions();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });
  const { data: suggestionCommentsData, refetch: refetchComments } = trpc.suggestions.comments.useQuery(
    { suggestionId: expandedSuggestion! },
    { enabled: expandedSuggestion !== null }
  );
  const addComment = trpc.suggestions.addComment.useMutation({
    onSuccess: () => {
      refetchComments();
      refetchSuggestions();
      setCommentInput("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });
  const deleteComment = trpc.suggestions.deleteComment.useMutation({
    onSuccess: () => {
      refetchComments();
      refetchSuggestions();
    },
  });
  const { data: mediaList, refetch: refetchMedia } = trpc.media.list.useQuery(undefined, { enabled: section === "media" });
  const { data: devotionalsList, refetch: refetchDevotionals } = trpc.devotionals.list.useQuery(undefined, { enabled: section === "devotionals" });
  const { data: chatMessages, refetch: refetchChat } = trpc.chat.messages.useQuery(undefined, { enabled: section === "chat", refetchInterval: section === "chat" ? 3000 : false });
  const sendMessage = trpc.chat.send.useMutation({ onSuccess: () => { refetchChat(); setChatInput(""); } });
  const createDevotional = trpc.devotionals.create.useMutation({
    onSuccess: (_data, variables) => {
      refetchDevotionals();
      setShowDevotionalForm(false);
      resetDevotionalForm();
      notifyNewDevotional(variables.title, variables.scriptureReference);
    },
  });
  const uploadMedia = trpc.media.upload.useMutation({
    onSuccess: () => {
      refetchMedia();
      setUploading(false);
    },
    onError: () => {
      setUploading(false);
      Alert.alert("Upload Failed", "Could not upload the file. Please try again.");
    },
  });
  const deleteMedia = trpc.media.delete.useMutation({
    onSuccess: () => {
      refetchMedia();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      Alert.alert("Error", "Could not delete the media. Please try again.");
    },
  });

  const handleDeleteMedia = (id: number) => {
    Alert.alert(
      "Delete Media",
      "Are you sure you want to delete this photo/video? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMedia.mutate({ id }),
        },
      ]
    );
  };

  // Load saved chat identity
  useEffect(() => {
    AsyncStorage.getItem(CHAT_MEMBER_KEY).then((val) => {
      if (val) setChatMemberId(Number(val));
      setLoadingIdentity(false);
    }).catch(() => setLoadingIdentity(false));
  }, []);

  const selectChatMember = async (memberId: number) => {
    setChatMemberId(memberId);
    await AsyncStorage.setItem(CHAT_MEMBER_KEY, String(memberId));
    setShowMemberPicker(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const resetDevotionalForm = () => {
    setDevTitle("");
    setDevScripture("");
    setDevScriptureRef("");
    setDevContent("");
  };

  const handleCreateDevotional = () => {
    if (!devTitle.trim() || !devContent.trim()) return;
    createDevotional.mutate({
      title: devTitle.trim(),
      scripture: devScripture.trim() || undefined,
      scriptureReference: devScriptureRef.trim() || undefined,
      content: devContent.trim(),
      date: new Date().toISOString(),
    });
  };

  const handleSend = () => {
    if (!chatInput.trim()) return;
    if (!chatMemberId) {
      setShowMemberPicker(true);
      return;
    }
    sendMessage.mutate({ content: chatInput.trim(), memberId: chatMemberId });
  };

  const handlePickMedia = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: false,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert("Error", "Could not read the selected file.");
        return;
      }

      setUploading(true);
      const fileName = asset.fileName || `upload_${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`;
      const mimeType = asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg");

      uploadMedia.mutate({
        fileBase64: asset.base64,
        fileName,
        mimeType,
        type: asset.type === "video" ? "video" : "photo",
      });
    } catch (e) {
      setUploading(false);
      Alert.alert("Error", "Something went wrong picking the file.");
    }
  }, [uploadMedia]);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const avatarColors = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#EF4444"];
  const getAvatarColor = (id: number) => avatarColors[id % avatarColors.length];

  const currentMember = membersList?.find((m) => m.id === chatMemberId);

  // ---- Media Section ----
  if (section === "media") {
    return (
      <ScreenContainer>
        <View style={styles.subHeader}>
          <Pressable onPress={() => setSection("menu")} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.subTitle, { color: colors.foreground }]}>Media</Text>
          <Pressable
            onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handlePickMedia(); }}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="plus.circle.fill" size={28} color={colors.primary} />
          </Pressable>
        </View>
        {uploading && (
          <View style={[styles.uploadBanner, { backgroundColor: colors.primary + "15" }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.uploadText, { color: colors.primary }]}>Uploading...</Text>
          </View>
        )}
        <FlatList
          data={mediaList || []}
          keyExtractor={(item) => item.id.toString()}
          numColumns={3}
          contentContainerStyle={styles.mediaGrid}
          columnWrapperStyle={styles.mediaRow}
          ListEmptyComponent={
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="photo.fill" size={48} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No media yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Tap + to upload photos & videos</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onLongPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleDeleteMedia(item.id);
              }}
              delayLongPress={500}
              style={({ pressed }) => [styles.mediaThumb, pressed && { opacity: 0.8 }]}
            >
              <Image source={{ uri: item.url }} style={[styles.mediaImage, { backgroundColor: colors.surface }]} />
              {item.type === "video" && (
                <View style={styles.videoOverlay}>
                  <IconSymbol name="play.fill" size={20} color="#FFF" />
                </View>
              )}
            </Pressable>
          )}
        />
      </ScreenContainer>
    );
  }

  // ---- Devotionals Section ----
  if (section === "devotionals") {
    return (
      <ScreenContainer>
        <View style={styles.subHeader}>
          <Pressable onPress={() => setSection("menu")} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.subTitle, { color: colors.foreground }]}>Devotionals</Text>
          <Pressable
            onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowDevotionalForm(true); }}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="plus.circle.fill" size={28} color={colors.primary} />
          </Pressable>
        </View>
        <FlatList
          data={devotionalsList || []}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="book.fill" size={48} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No devotionals yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Tap + to create one</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/devotional/${item.id}` as any)}
              style={({ pressed }) => [styles.devotionalCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.devotionalIcon, { backgroundColor: colors.primary + "20" }]}>
                <IconSymbol name="book.fill" size={20} color={colors.primary} />
              </View>
              <View style={styles.devotionalInfo}>
                <Text style={[styles.devotionalTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
                {item.scriptureReference && <Text style={[styles.devotionalRef, { color: colors.primary }]}>{item.scriptureReference}</Text>}
                <Text style={[styles.devotionalDate, { color: colors.muted }]}>{new Date(item.date).toLocaleDateString()}</Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </Pressable>
          )}
        />

        {/* Create Devotional Modal */}
        <Modal visible={showDevotionalForm} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => { setShowDevotionalForm(false); resetDevotionalForm(); }} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                  <Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Devotional</Text>
                <Pressable
                  onPress={handleCreateDevotional}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                  disabled={!devTitle.trim() || !devContent.trim()}
                >
                  <Text style={[styles.modalSave, { color: devTitle.trim() && devContent.trim() ? colors.primary : colors.muted }]}>Post</Text>
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.muted }]}>Title *</Text>
                  <TextInput
                    value={devTitle}
                    onChangeText={setDevTitle}
                    placeholder="e.g., Walking in Faith"
                    placeholderTextColor={colors.muted}
                    style={[styles.formInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.muted }]}>Scripture Reference</Text>
                  <TextInput
                    value={devScriptureRef}
                    onChangeText={setDevScriptureRef}
                    placeholder="e.g., Psalm 23:1"
                    placeholderTextColor={colors.muted}
                    style={[styles.formInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.muted }]}>Scripture Text</Text>
                  <TextInput
                    value={devScripture}
                    onChangeText={setDevScripture}
                    placeholder="Paste the scripture verse..."
                    placeholderTextColor={colors.muted}
                    multiline
                    style={[styles.formTextArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.muted }]}>Reflection *</Text>
                  <TextInput
                    value={devContent}
                    onChangeText={setDevContent}
                    placeholder="Write your reflection or devotional message..."
                    placeholderTextColor={colors.muted}
                    multiline
                    style={[styles.formTextAreaLarge, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScreenContainer>
    );
  }

  // ---- Chat Section ----
  if (section === "chat") {
    return (
      <ScreenContainer>
        <View style={styles.subHeader}>
          <Pressable onPress={() => setSection("menu")} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.subTitle, { color: colors.foreground }]}>Group Chat</Text>
          {currentMember ? (
            <Pressable
              onPress={() => setShowMemberPicker(true)}
              style={({ pressed }) => [styles.chatIdentityBadge, { backgroundColor: colors.primary + "15" }, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.chatIdentityDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.chatIdentityName, { color: colors.primary }]} numberOfLines={1}>
                {currentMember.name.split(" ")[0]}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setShowMemberPicker(true)}
              style={({ pressed }) => [styles.chatIdentityBadge, { backgroundColor: colors.warning + "15" }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.chatIdentityName, { color: colors.warning }]}>Set Name</Text>
            </Pressable>
          )}
        </View>

        {/* Identity prompt banner */}
        {!chatMemberId && !loadingIdentity && (
          <Pressable
            onPress={() => setShowMemberPicker(true)}
            style={({ pressed }) => [styles.identityBanner, { backgroundColor: colors.primary + "12" }, pressed && { opacity: 0.8 }]}
          >
            <IconSymbol name="person.badge.plus" size={20} color={colors.primary} />
            <Text style={[styles.identityBannerText, { color: colors.primary }]}>
              Tap here to select your name so others know who you are
            </Text>
          </Pressable>
        )}

        <FlatList
          data={chatMessages || []}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.chatEmpty}>
              <Text style={[styles.chatEmptyText, { color: colors.muted }]}>No messages yet. Start the conversation!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = chatMemberId && item.userId === chatMemberId;
            const senderName = item.member?.name || "Guest";
            const senderId = item.member?.id || item.userId || 0;
            return (
              <View style={[styles.chatBubbleRow, isMe ? styles.chatBubbleRowMe : undefined]}>
                {!isMe && (
                  <View style={[styles.chatAvatar, { backgroundColor: getAvatarColor(senderId) }]}>
                    <Text style={styles.chatAvatarText}>{getInitials(senderName)}</Text>
                  </View>
                )}
                <View style={[
                  styles.chatBubble,
                  isMe
                    ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
                    : { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
                ]}>
                  {!isMe && (
                    <Text style={[styles.chatSender, { color: getAvatarColor(senderId) }]}>{senderName}</Text>
                  )}
                  <Text style={[styles.chatText, { color: isMe ? "#FFF" : colors.foreground }]}>{item.content}</Text>
                  <Text style={[styles.chatTime, { color: isMe ? "rgba(255,255,255,0.6)" : colors.muted }]}>
                    {new Date(item.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </Text>
                </View>
                {isMe && (
                  <View style={[styles.chatAvatar, { backgroundColor: getAvatarColor(senderId) }]}>
                    <Text style={styles.chatAvatarText}>{getInitials(senderName)}</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
        <View style={[styles.chatInputRow, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TextInput
            value={chatInput}
            onChangeText={setChatInput}
            placeholder={chatMemberId ? "Type a message..." : "Select your name first..."}
            placeholderTextColor={colors.muted}
            style={[styles.chatInputField, { backgroundColor: colors.surface, color: colors.foreground }]}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            style={({ pressed }) => [styles.sendButton, { backgroundColor: colors.primary }, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
          >
            <IconSymbol name="paperplane.fill" size={18} color="#FFF" />
          </Pressable>
        </View>

        {/* Member Picker Modal */}
        <Modal visible={showMemberPicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowMemberPicker(false)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                  <Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Who are you?</Text>
                <View style={{ width: 60 }} />
              </View>
              <Text style={[styles.pickerSubtitle, { color: colors.muted }]}>
                Select your name so others can see who's chatting. If you haven't signed up yet, go to the Members tab first.
              </Text>
              <FlatList
                data={membersList || []}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.pickerList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.pickerEmpty}>
                    <IconSymbol name="person.2.fill" size={36} color={colors.muted} />
                    <Text style={[styles.pickerEmptyText, { color: colors.muted }]}>No members yet. Sign up in the Members tab first.</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isSelected = chatMemberId === item.id;
                  return (
                    <Pressable
                      onPress={() => selectChatMember(item.id)}
                      style={({ pressed }) => [
                        styles.pickerItem,
                        { backgroundColor: isSelected ? colors.primary + "15" : colors.surface, borderColor: isSelected ? colors.primary : colors.border },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <View style={[styles.pickerAvatar, { backgroundColor: getAvatarColor(item.id) }]}>
                        <Text style={styles.pickerAvatarText}>{getInitials(item.name)}</Text>
                      </View>
                      <View style={styles.pickerInfo}>
                        <Text style={[styles.pickerName, { color: colors.foreground }]}>{item.name}</Text>
                        {item.role && <Text style={[styles.pickerRole, { color: colors.muted }]}>{item.role}</Text>}
                      </View>
                      {isSelected && <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />}
                    </Pressable>
                  );
                }}
              />
            </View>
          </View>
        </Modal>
      </ScreenContainer>
    );
  }

  // ---- Suggestion Board Section ----
  if (section === "suggestions") {
    const handlePostSuggestion = () => {
      if (!sugTitle.trim()) {
        Alert.alert("Required", "Please enter a title for your suggestion.");
        return;
      }
      if (!chatMemberId) {
        setShowMemberPicker(true);
        return;
      }
      createSuggestion.mutate({
        memberId: chatMemberId,
        category: sugCategory,
        title: sugTitle.trim(),
        description: sugDescription.trim() || undefined,
      });
    };

    const handleDeleteSuggestion = (id: number) => {
      Alert.alert(
        "Delete Suggestion",
        "Are you sure you want to delete this suggestion?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteSuggestion.mutate({ id }) },
        ]
      );
    };

    const getCategoryInfo = (cat: string) => SUGGESTION_CATEGORIES.find((c) => c.key === cat) || SUGGESTION_CATEGORIES[3];

    return (
      <ScreenContainer>
        <View style={styles.subHeader}>
          <Pressable onPress={() => setSection("menu")} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.subTitle, { color: colors.foreground }]}>Suggestion Board</Text>
          <Pressable
            onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSuggestionForm(true); }}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="plus.circle.fill" size={28} color={colors.primary} />
          </Pressable>
        </View>

        <FlatList
          data={suggestionsList || []}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="paintbrush.fill" size={48} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No suggestions yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Tap + to share your ideas</Text>
            </View>
          }
          renderItem={({ item }) => {
            const catInfo = getCategoryInfo(item.category);
            const memberName = (item as any).member?.name || "Someone";
            return (
              <View style={[styles.suggestionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.suggestionHeader}>
                  <View style={[styles.suggestionCatBadge, { backgroundColor: catInfo.color + "20" }]}>
                    <Text style={[styles.suggestionCatText, { color: catInfo.color }]}>{catInfo.label}</Text>
                  </View>
                  <Pressable
                    onPress={() => handleDeleteSuggestion(item.id)}
                    style={({ pressed }) => [pressed && { opacity: 0.5 }]}
                  >
                    <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
                  </Pressable>
                </View>
                <Text style={[styles.suggestionTitle, { color: colors.foreground }]}>{item.title}</Text>
                {item.description && (
                  <Text style={[styles.suggestionDesc, { color: colors.muted }]}>{item.description}</Text>
                )}
                <View style={styles.suggestionFooter}>
                  <Text style={[styles.suggestionAuthor, { color: colors.muted }]}>
                    by {memberName} \u2022 {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Pressable
                      onPress={() => {
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setExpandedSuggestion(expandedSuggestion === item.id ? null : item.id);
                        setCommentInput("");
                      }}
                      style={({ pressed }) => [styles.likeButton, { backgroundColor: colors.muted + "15" }, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
                    >
                      <IconSymbol name="bubble.left.fill" size={14} color={colors.muted} />
                      <Text style={[styles.likeCount, { color: colors.muted }]}>{(item as any).commentCount || 0}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        likeSuggestion.mutate({ id: item.id });
                      }}
                      style={({ pressed }) => [styles.likeButton, { backgroundColor: colors.primary + "12" }, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
                    >
                      <IconSymbol name="heart.fill" size={16} color={colors.primary} />
                      <Text style={[styles.likeCount, { color: colors.primary }]}>{item.likes || 0}</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Threaded Comments Section */}
                {expandedSuggestion === item.id && (
                  <View style={[styles.commentsSection, { borderTopColor: colors.border }]}>
                    {(suggestionCommentsData || []).length === 0 ? (
                      <Text style={[styles.noCommentsText, { color: colors.muted }]}>No comments yet. Be the first to reply!</Text>
                    ) : (
                      (suggestionCommentsData || []).map((comment: any) => (
                        <View key={comment.id} style={[styles.commentItem, { borderBottomColor: colors.border + "40" }]}>
                          <View style={[styles.commentAvatar, { backgroundColor: getAvatarColor(comment.memberId) }]}>
                            <Text style={styles.commentAvatarText}>{getInitials(comment.member?.name || null)}</Text>
                          </View>
                          <View style={styles.commentBody}>
                            <View style={styles.commentHeaderRow}>
                              <Text style={[styles.commentAuthor, { color: colors.foreground }]}>{comment.member?.name || "Someone"}</Text>
                              <Text style={[styles.commentTime, { color: colors.muted }]}>{new Date(comment.createdAt).toLocaleDateString()}</Text>
                            </View>
                            <Text style={[styles.commentContent, { color: colors.foreground }]}>{comment.content}</Text>
                          </View>
                          <Pressable
                            onPress={() => {
                              Alert.alert("Delete Comment", "Remove this comment?", [
                                { text: "Cancel", style: "cancel" },
                                { text: "Delete", style: "destructive", onPress: () => deleteComment.mutate({ id: comment.id }) },
                              ]);
                            }}
                            style={({ pressed }) => [{ padding: 4 }, pressed && { opacity: 0.5 }]}
                          >
                            <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
                          </Pressable>
                        </View>
                      ))
                    )}
                    <View style={[styles.commentInputRow, { borderTopColor: colors.border + "40" }]}>
                      <TextInput
                        value={commentInput}
                        onChangeText={setCommentInput}
                        placeholder="Add a comment..."
                        placeholderTextColor={colors.muted}
                        style={[styles.commentInputField, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                        returnKeyType="send"
                        onSubmitEditing={() => {
                          if (!commentInput.trim() || !chatMemberId) return;
                          addComment.mutate({ suggestionId: item.id, memberId: chatMemberId, content: commentInput.trim() });
                        }}
                      />
                      <Pressable
                        onPress={() => {
                          if (!commentInput.trim()) return;
                          if (!chatMemberId) { setShowMemberPicker(true); return; }
                          addComment.mutate({ suggestionId: item.id, memberId: chatMemberId, content: commentInput.trim() });
                        }}
                        disabled={!commentInput.trim() || addComment.isPending}
                        style={({ pressed }) => [styles.commentSendBtn, { backgroundColor: commentInput.trim() ? colors.primary : colors.muted + "30" }, pressed && { opacity: 0.7 }]}
                      >
                        <IconSymbol name="paperplane.fill" size={14} color="#FFF" />
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
        />

        {/* Create Suggestion Modal */}
        <Modal visible={showSuggestionForm} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => { setShowSuggestionForm(false); setSugTitle(""); setSugDescription(""); setSugCategory("general"); }} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                  <Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Suggestion</Text>
                <Pressable
                  onPress={handlePostSuggestion}
                  disabled={!sugTitle.trim() || createSuggestion.isPending}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.modalSave, { color: sugTitle.trim() ? colors.primary : colors.muted }]}>
                    {createSuggestion.isPending ? "..." : "Post"}
                  </Text>
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.muted }]}>Category</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {SUGGESTION_CATEGORIES.map((cat) => (
                      <Pressable
                        key={cat.key}
                        onPress={() => {
                          setSugCategory(cat.key);
                          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={({ pressed }) => [{
                          paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                          borderColor: sugCategory === cat.key ? cat.color : colors.border,
                          backgroundColor: sugCategory === cat.key ? cat.color + "20" : colors.surface,
                        }, pressed && { opacity: 0.7 }]}
                      >
                        <Text style={{ fontSize: 14, fontWeight: "600", color: sugCategory === cat.key ? cat.color : colors.foreground }}>{cat.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.muted }]}>Title *</Text>
                  <TextInput
                    value={sugTitle}
                    onChangeText={setSugTitle}
                    placeholder="e.g., Let's learn 'Goodness of God'"
                    placeholderTextColor={colors.muted}
                    style={[styles.formInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.muted }]}>Details (optional)</Text>
                  <TextInput
                    value={sugDescription}
                    onChangeText={setSugDescription}
                    placeholder="Add more details about your suggestion..."
                    placeholderTextColor={colors.muted}
                    multiline
                    style={[styles.formTextArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Member Picker Modal (for identifying who posts) */}
        <Modal visible={showMemberPicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowMemberPicker(false)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                  <Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Who are you?</Text>
                <View style={{ width: 60 }} />
              </View>
              <Text style={[styles.pickerSubtitle, { color: colors.muted }]}>
                Select your name to post a suggestion. If you haven't signed up yet, go to the Members tab first.
              </Text>
              <FlatList
                data={membersList || []}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.pickerList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.pickerEmpty}>
                    <IconSymbol name="person.2.fill" size={36} color={colors.muted} />
                    <Text style={[styles.pickerEmptyText, { color: colors.muted }]}>No members yet. Sign up in the Members tab first.</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isSelected = chatMemberId === item.id;
                  return (
                    <Pressable
                      onPress={() => selectChatMember(item.id)}
                      style={({ pressed }) => [
                        styles.pickerItem,
                        { backgroundColor: isSelected ? colors.primary + "15" : colors.surface, borderColor: isSelected ? colors.primary : colors.border },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <View style={[styles.pickerAvatar, { backgroundColor: getAvatarColor(item.id) }]}>
                        <Text style={styles.pickerAvatarText}>{getInitials(item.name)}</Text>
                      </View>
                      <View style={styles.pickerInfo}>
                        <Text style={[styles.pickerName, { color: colors.foreground }]}>{item.name}</Text>
                        {item.role && <Text style={[styles.pickerRole, { color: colors.muted }]}>{item.role}</Text>}
                      </View>
                      {isSelected && <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />}
                    </Pressable>
                  );
                }}
              />
            </View>
          </View>
        </Modal>
      </ScreenContainer>
    );
  }

  // ---- Google Drive Section ----
  if (section === "drive") {
    return (
      <ScreenContainer>
        <View style={styles.subHeader}>
          <Pressable onPress={() => setSection("menu")} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.subTitle, { color: colors.foreground }]}>Google Drive</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.driveContent}>
          <View style={[styles.driveCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.driveIconWrap, { backgroundColor: "#4285F4" + "20" }]}>
              <IconSymbol name="folder.fill" size={36} color="#4285F4" />
            </View>
            <Text style={[styles.driveTitle, { color: colors.foreground }]}>Music Files & Lyrics</Text>
            <Text style={[styles.driveDesc, { color: colors.muted }]}>
              Access shared music files, chord charts, and lyrics from your group's Google Drive folder.
            </Text>
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL("https://drive.google.com/drive/folders/1sd5-BsEpi3AZWa0V7b7RhPAP4WScB2t7");
              }}
              style={({ pressed }) => [styles.driveButton, { backgroundColor: "#4285F4" }, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
            >
              <IconSymbol name="folder.fill" size={18} color="#FFF" />
              <Text style={styles.driveButtonText}>Open Google Drive</Text>
            </Pressable>
          </View>

          <View style={[styles.driveTips, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.driveTipsTitle, { color: colors.foreground }]}>Quick Tips</Text>
            <View style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.tipText, { color: colors.muted }]}>Create a shared folder for your group's music files</Text>
            </View>
            <View style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.tipText, { color: colors.muted }]}>Upload chord charts, lyrics PDFs, and audio tracks</Text>
            </View>
            <View style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.tipText, { color: colors.muted }]}>Share the folder link with all group members</Text>
            </View>
            <View style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.tipText, { color: colors.muted }]}>Members can access files directly from the Drive app</Text>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ---- About / Settings Section ----
  if (section === "about") {
    return (
      <ScreenContainer>
        <View style={styles.subHeader}>
          <Pressable onPress={() => setSection("menu")} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.subTitle, { color: colors.foreground }]}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.aboutContent}>
          <View style={[styles.aboutCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Image source={require("@/assets/images/icon.png")} style={styles.aboutLogo} />
            <Text style={[styles.aboutName, { color: colors.foreground }]}>The Plug</Text>
            <Text style={[styles.aboutTagline, { color: colors.muted }]}>Stay connected. Stay plugged in.</Text>
          </View>

          {/* Appearance */}
          <View style={[styles.settingsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.settingsSectionTitle, { color: colors.muted }]}>Appearance</Text>
            <View style={[styles.settingsItem, { borderBottomColor: colors.border }]}>
              <IconSymbol name="moon.fill" size={20} color={colors.primary} />
              <Text style={[styles.settingsText, { color: colors.foreground }]}>Dark Mode</Text>
              <Switch
                value={isDark}
                onValueChange={(value) => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setColorScheme(value ? "dark" : "light");
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFF"
              />
            </View>
          </View>

          {/* Chat Identity */}
          <View style={[styles.settingsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.settingsSectionTitle, { color: colors.muted }]}>Chat Identity</Text>
            <Pressable
              onPress={() => setShowMemberPicker(true)}
              style={({ pressed }) => [styles.settingsItem, { borderBottomColor: "transparent" }, pressed && { opacity: 0.7 }]}
            >
              <IconSymbol name="person.fill" size={20} color={colors.primary} />
              <Text style={[styles.settingsText, { color: colors.foreground }]}>Chat As</Text>
              <Text style={[styles.settingsValue, { color: currentMember ? colors.primary : colors.muted }]}>
                {currentMember ? currentMember.name : "Not set"}
              </Text>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>
          </View>

          {/* App Info */}
          <View style={[styles.settingsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.settingsSectionTitle, { color: colors.muted }]}>App Info</Text>
            <View style={[styles.settingsItem, { borderBottomColor: colors.border }]}>
              <IconSymbol name="power" size={20} color={colors.primary} />
              <Text style={[styles.settingsText, { color: colors.foreground }]}>Version</Text>
              <Text style={[styles.settingsValue, { color: colors.muted }]}>1.0.0</Text>
            </View>
            <View style={[styles.settingsItem, { borderBottomColor: "transparent" }]}>
              <IconSymbol name="music.note" size={20} color={colors.primary} />
              <Text style={[styles.settingsText, { color: colors.foreground }]}>Music / Worship Group</Text>
            </View>
          </View>
        </ScrollView>

        {/* Member Picker Modal (also accessible from Settings) */}
        <Modal visible={showMemberPicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowMemberPicker(false)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                  <Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Who are you?</Text>
                <View style={{ width: 60 }} />
              </View>
              <Text style={[styles.pickerSubtitle, { color: colors.muted }]}>
                Select your name so others can see who's chatting.
              </Text>
              <FlatList
                data={membersList || []}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.pickerList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.pickerEmpty}>
                    <IconSymbol name="person.2.fill" size={36} color={colors.muted} />
                    <Text style={[styles.pickerEmptyText, { color: colors.muted }]}>No members yet. Sign up in the Members tab first.</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isSelected = chatMemberId === item.id;
                  return (
                    <Pressable
                      onPress={() => selectChatMember(item.id)}
                      style={({ pressed }) => [
                        styles.pickerItem,
                        { backgroundColor: isSelected ? colors.primary + "15" : colors.surface, borderColor: isSelected ? colors.primary : colors.border },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <View style={[styles.pickerAvatar, { backgroundColor: getAvatarColor(item.id) }]}>
                        <Text style={styles.pickerAvatarText}>{getInitials(item.name)}</Text>
                      </View>
                      <View style={styles.pickerInfo}>
                        <Text style={[styles.pickerName, { color: colors.foreground }]}>{item.name}</Text>
                        {item.role && <Text style={[styles.pickerRole, { color: colors.muted }]}>{item.role}</Text>}
                      </View>
                      {isSelected && <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />}
                    </Pressable>
                  );
                }}
              />
            </View>
          </View>
        </Modal>
      </ScreenContainer>
    );
  }

  // ---- Main Menu ----
  const menuItems = [
    { key: "media" as Section, icon: "photo.fill" as const, label: "Media", desc: "Photos & videos" },
    { key: "devotionals" as Section, icon: "book.fill" as const, label: "Devotionals", desc: "Daily scripture & reflections" },
    { key: "chat" as Section, icon: "bubble.left.fill" as const, label: "Group Chat", desc: "Chat with the group" },
    { key: "suggestions" as Section, icon: "paintbrush.fill" as const, label: "Suggestion Board", desc: "Song ideas, venues & more" },
    { key: "drive" as Section, icon: "folder.fill" as const, label: "Google Drive", desc: "Music files & lyrics" },
    { key: "popl" as Section, icon: "link" as const, label: "Connect With Us", desc: "Digital card & social links" },
    { key: "about" as Section, icon: "gear" as const, label: "Settings", desc: "Theme, app info" },
  ];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>More</Text>
      </View>
      <ScrollView contentContainerStyle={styles.menuContent} showsVerticalScrollIndicator={false}>
        {menuItems.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (item.key === "popl") {
                Linking.openURL("https://popl.co/card/lfHOkdyC/3");
              } else {
                setSection(item.key);
              }
            }}
            style={({ pressed }) => [styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.key === "drive" ? "#4285F4" + "20" : item.key === "popl" ? "#6C5CE7" + "20" : item.key === "suggestions" ? "#F59E0B" + "20" : colors.primary + "20" }]}>
              <IconSymbol name={item.icon} size={22} color={item.key === "drive" ? "#4285F4" : item.key === "popl" ? "#6C5CE7" : item.key === "suggestions" ? "#F59E0B" : colors.primary} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Text style={[styles.menuDesc, { color: colors.muted }]}>{item.desc}</Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: "800" },
  subHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  subTitle: { fontSize: 20, fontWeight: "700" },
  menuContent: { paddingHorizontal: 20, gap: 10, paddingBottom: 32 },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 },
  menuIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  menuInfo: { flex: 1, gap: 2 },
  menuLabel: { fontSize: 16, fontWeight: "700" },
  menuDesc: { fontSize: 13 },
  listContent: { paddingHorizontal: 20, paddingBottom: 32, gap: 8 },
  devotionalCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  devotionalIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  devotionalInfo: { flex: 1, gap: 2 },
  devotionalTitle: { fontSize: 16, fontWeight: "600" },
  devotionalRef: { fontSize: 13, fontWeight: "600" },
  devotionalDate: { fontSize: 12 },
  mediaGrid: { paddingHorizontal: 4, paddingBottom: 32 },
  mediaRow: { gap: 2 },
  mediaThumb: { flex: 1, aspectRatio: 1, margin: 1 },
  mediaImage: { width: "100%", height: "100%", borderRadius: 2 },
  videoOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)" },
  uploadBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, gap: 8, marginHorizontal: 20, borderRadius: 12, marginBottom: 8 },
  uploadText: { fontSize: 14, fontWeight: "600" },
  // Chat styles
  chatContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 8, flexGrow: 1 },
  chatEmpty: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 },
  chatEmptyText: { fontSize: 15 },
  chatBubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  chatBubbleRowMe: { flexDirection: "row", justifyContent: "flex-end" },
  chatAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  chatAvatarText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  chatBubble: { maxWidth: "70%", padding: 12, borderRadius: 18, gap: 4 },
  chatSender: { fontSize: 12, fontWeight: "700" },
  chatText: { fontSize: 15, lineHeight: 20 },
  chatTime: { fontSize: 10, alignSelf: "flex-end" },
  chatInputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, gap: 8 },
  chatInputField: { flex: 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, fontSize: 15 },
  sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  chatIdentityBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  chatIdentityDot: { width: 8, height: 8, borderRadius: 4 },
  chatIdentityName: { fontSize: 13, fontWeight: "700", maxWidth: 80 },
  identityBanner: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12, gap: 10 },
  identityBannerText: { flex: 1, fontSize: 13, fontWeight: "600" },
  // Member picker
  pickerSubtitle: { fontSize: 14, paddingHorizontal: 20, paddingBottom: 12 },
  pickerList: { paddingHorizontal: 20, paddingBottom: 32, gap: 8 },
  pickerItem: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1.5, gap: 12 },
  pickerAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  pickerAvatarText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  pickerInfo: { flex: 1, gap: 2 },
  pickerName: { fontSize: 16, fontWeight: "700" },
  pickerRole: { fontSize: 13 },
  pickerEmpty: { alignItems: "center", paddingTop: 40, gap: 12 },
  pickerEmptyText: { fontSize: 14, textAlign: "center" },
  // About/Settings
  aboutContent: { paddingHorizontal: 20, gap: 20, paddingBottom: 40 },
  aboutCard: { padding: 24, borderRadius: 20, borderWidth: 1, alignItems: "center", gap: 8 },
  aboutLogo: { width: 80, height: 80, borderRadius: 20 },
  aboutName: { fontSize: 22, fontWeight: "800" },
  aboutTagline: { fontSize: 14 },
  settingsSection: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  settingsSectionTitle: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  settingsItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, gap: 12 },
  settingsText: { flex: 1, fontSize: 15, fontWeight: "500" },
  settingsValue: { fontSize: 14 },
  emptyState: { padding: 48, borderRadius: 20, borderWidth: 1, alignItems: "center", gap: 8, marginTop: 40, marginHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%", minHeight: "60%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: "#333" },
  modalCancel: { fontSize: 16, fontWeight: "500" },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalSave: { fontSize: 16, fontWeight: "700" },
  formScroll: { paddingHorizontal: 20, paddingVertical: 20, gap: 20 },
  formGroup: { gap: 6 },
  formLabel: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  formInput: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, fontSize: 16, borderWidth: 1 },
  formTextArea: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, fontSize: 16, borderWidth: 1, minHeight: 80, textAlignVertical: "top" },
  formTextAreaLarge: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, fontSize: 16, borderWidth: 1, minHeight: 140, textAlignVertical: "top" },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  // Google Drive styles
  driveContent: { paddingHorizontal: 20, gap: 20, paddingBottom: 40 },
  driveCard: { padding: 28, borderRadius: 20, borderWidth: 1, alignItems: "center", gap: 16 },
  driveIconWrap: { width: 80, height: 80, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  driveTitle: { fontSize: 22, fontWeight: "800" },
  driveDesc: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  driveButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, gap: 10 },
  driveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  driveTips: { padding: 20, borderRadius: 16, borderWidth: 1, gap: 14 },
  driveTipsTitle: { fontSize: 17, fontWeight: "700" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20 },
  // Suggestion Board styles
  suggestionCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8, marginBottom: 2 },
  suggestionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  suggestionCatBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  suggestionCatText: { fontSize: 12, fontWeight: "700" },
  suggestionTitle: { fontSize: 17, fontWeight: "700" },
  suggestionDesc: { fontSize: 14, lineHeight: 20 },
  suggestionFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  suggestionAuthor: { fontSize: 12 },
  likeButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  likeCount: { fontSize: 14, fontWeight: "700" },
  // Comment styles
  commentsSection: { marginTop: 8, paddingTop: 10, borderTopWidth: 1 },
  noCommentsText: { fontSize: 13, fontStyle: "italic", paddingVertical: 8 },
  commentItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 8, borderBottomWidth: 0.5 },
  commentAvatar: { width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  commentAvatarText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
  commentBody: { flex: 1, gap: 2 },
  commentHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  commentAuthor: { fontSize: 13, fontWeight: "700" },
  commentTime: { fontSize: 11 },
  commentContent: { fontSize: 14, lineHeight: 19 },
  commentInputRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 10, borderTopWidth: 0.5 },
  commentInputField: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, fontSize: 14, borderWidth: 1 },
  commentSendBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
});
