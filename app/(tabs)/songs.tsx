import { useState, useMemo } from "react";
import { FlatList, Text, View, Pressable, StyleSheet, TextInput, Modal, ScrollView, Platform, Linking } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";

export default function SongsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [segment, setSegment] = useState<"songs" | "setlists">("songs");
  const [search, setSearch] = useState("");

  // Song creation state
  const [showCreateSong, setShowCreateSong] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newTempo, setNewTempo] = useState("");
  const [newLyrics, setNewLyrics] = useState("");
  const [newYoutubeUrl, setNewYoutubeUrl] = useState("");
  const [newSpotifyUrl, setNewSpotifyUrl] = useState("");
  const [newAppleMusicUrl, setNewAppleMusicUrl] = useState("");

  // Setlist creation state
  const [showCreateSetlist, setShowCreateSetlist] = useState(false);
  const [setlistTitle, setSetlistTitle] = useState("");
  const [setlistDate, setSetlistDate] = useState("");
  const [selectedSongIds, setSelectedSongIds] = useState<number[]>([]);
  const [songSearch, setSongSearch] = useState("");

  const { data: songsList, refetch: refetchSongs } = trpc.songs.list.useQuery();
  const { data: setlistsList, refetch: refetchSetlists } = trpc.setlists.list.useQuery();
  const createSong = trpc.songs.create.useMutation({ onSuccess: () => { refetchSongs(); setShowCreateSong(false); resetSongForm(); } });
  const createSetlist = trpc.setlists.create.useMutation();
  const addSongToSetlist = trpc.setlists.addSong.useMutation();

  const resetSongForm = () => { setNewTitle(""); setNewArtist(""); setNewKey(""); setNewTempo(""); setNewLyrics(""); setNewYoutubeUrl(""); setNewSpotifyUrl("");
    setNewAppleMusicUrl(""); };
  const resetSetlistForm = () => { setSetlistTitle(""); setSetlistDate(""); setSelectedSongIds([]); setSongSearch(""); };

  const filteredSongs = (songsList || []).filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.artist && s.artist.toLowerCase().includes(search.toLowerCase()))
  );

  // Songs available for setlist picker, filtered by search
  const pickerSongs = useMemo(() => {
    const all = songsList || [];
    if (!songSearch.trim()) return all;
    return all.filter(s =>
      s.title.toLowerCase().includes(songSearch.toLowerCase()) ||
      (s.artist && s.artist.toLowerCase().includes(songSearch.toLowerCase()))
    );
  }, [songsList, songSearch]);

  const handleCreateSong = () => {
    if (!newTitle.trim()) return;
    createSong.mutate({
      title: newTitle.trim(),
      artist: newArtist.trim() || undefined,
      songKey: newKey.trim() || undefined,
      tempo: newTempo ? parseInt(newTempo) : undefined,
      lyrics: newLyrics.trim() || undefined,
      youtubeUrl: newYoutubeUrl.trim() || undefined,
      spotifyUrl: newSpotifyUrl.trim() || undefined,
      appleMusicUrl: newAppleMusicUrl.trim() || undefined,
    });
  };

  const toggleSongSelection = (songId: number) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSongIds(prev =>
      prev.includes(songId) ? prev.filter(id => id !== songId) : [...prev, songId]
    );
  };

  const handleCreateSetlist = async () => {
    if (!setlistTitle.trim()) return;
    try {
      const result = await createSetlist.mutateAsync({
        title: setlistTitle.trim(),
        date: setlistDate.trim() || undefined,
      });
      // Add selected songs to the setlist in order
      for (let i = 0; i < selectedSongIds.length; i++) {
        await addSongToSetlist.mutateAsync({
          setlistId: result as number,
          songId: selectedSongIds[i],
          orderIndex: i,
        });
      }
      refetchSetlists();
      setShowCreateSetlist(false);
      resetSetlistForm();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Error handled by mutation
    }
  };

  const openSongUrl = async (url?: string | null) => {
    if (!url) return;
    const cleanUrl = url.startsWith("http") ? url : `https://${url}`;
    await Linking.openURL(cleanUrl);
  };

  const handleAddPress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (segment === "songs") {
      setShowCreateSong(true);
    } else {
      setShowCreateSetlist(true);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Songs</Text>
        <Pressable
          onPress={handleAddPress}
          style={({ pressed }) => [styles.addButton, { backgroundColor: colors.primary }, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
        >
          <IconSymbol name="plus" size={20} color="#FFF" />
        </Pressable>
      </View>

      {/* Segmented Control */}
      <View style={[styles.segmentedControl, { backgroundColor: colors.surface }]}>
        {(["songs", "setlists"] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSegment(s)}
            style={[styles.segmentButton, segment === s && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.segmentText, { color: segment === s ? "#FFF" : colors.muted }]}>
              {s === "songs" ? "Songs" : "Setlists"}
            </Text>
          </Pressable>
        ))}
      </View>

      {segment === "songs" ? (
        <>
          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search songs..."
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.foreground }]}
            />
          </View>
          <FlatList
            data={filteredSongs}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <IconSymbol name="music.note" size={48} color={colors.muted} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No songs yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Add songs to build your library</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/song/${item.id}` as any)}
                style={({ pressed }) => [styles.songCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.songIcon, { backgroundColor: colors.primary + "20" }]}>
                  <IconSymbol name="music.note" size={20} color={colors.primary} />
                </View>
                <View style={styles.songInfo}>
                  <Text style={[styles.songTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
                  {item.artist && <Text style={[styles.songArtist, { color: colors.muted }]} numberOfLines={1}>{item.artist}</Text>}
                </View>
                <View style={styles.songMeta}>
                  {item.audioUrl && (
                    <View style={[styles.keyBadge, { backgroundColor: colors.primary + "20" }]}>
                      <IconSymbol name="waveform" size={12} color={colors.primary} />
                    </View>
                  )}
                  {item.youtubeUrl && (
                    <Pressable
                      onPress={() => openSongUrl(item.youtubeUrl)}
                      style={[styles.keyBadge, { backgroundColor: "#FF000020" }]}
                    >
                      <Text style={[styles.keyText, { color: "#FF0000" }]}>YT</Text>
                    </Pressable>
                  )}
                  {item.spotifyUrl && (
                    <Pressable
                      onPress={() => openSongUrl(item.spotifyUrl)}
                      style={[styles.keyBadge, { backgroundColor: "#1DB95420" }]}
                    >
                      <Text style={[styles.keyText, { color: "#1DB954" }]}>SP</Text>
                    </Pressable>
                  )}
                  {item.appleMusicUrl && (
                    <Pressable
                      onPress={() => openSongUrl(item.appleMusicUrl)}
                      style={[styles.keyBadge, { backgroundColor: "#FC3C4420" }]}
                    >
                      <Text style={[styles.keyText, { color: "#FC3C44" }]}>AM</Text>
                    </Pressable>
                  )}
                  {item.spotifyUrl && (
                    <Pressable
                      onPress={() => openSongUrl(item.spotifyUrl)}
                      style={[styles.keyBadge, { backgroundColor: "#1DB95420" }]}
                    >
                      <Text style={[styles.keyText, { color: "#1DB954" }]}>SP</Text>
                    </Pressable>
                  )}
                  {item.songKey && (
                    <View style={[styles.keyBadge, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[styles.keyText, { color: colors.primary }]}>{item.songKey}</Text>
                    </View>
                  )}
                  {item.tempo && <Text style={[styles.tempoText, { color: colors.muted }]}>{item.tempo} BPM</Text>}
                </View>
              </Pressable>
            )}
          />
        </>
      ) : (
        <FlatList
          data={setlistsList || []}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="music.note.list" size={48} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No setlists yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Create a setlist for your next event</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/setlist/${item.id}` as any)}
              style={({ pressed }) => [styles.songCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.songIcon, { backgroundColor: "#8B5CF6" + "20" }]}>
                <IconSymbol name="music.note.list" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.songInfo}>
                <Text style={[styles.songTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
                {item.date && <Text style={[styles.songArtist, { color: colors.muted }]}>{new Date(item.date).toLocaleDateString()}</Text>}
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </Pressable>
          )}
        />
      )}

      {/* Create Song Modal */}
      <Modal visible={showCreateSong} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Song</Text>
              <Pressable onPress={() => { setShowCreateSong(false); resetSongForm(); }} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                <IconSymbol name="xmark" size={24} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.muted }]}>Title *</Text>
              <TextInput value={newTitle} onChangeText={setNewTitle} placeholder="Song title" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]} />
              <Text style={[styles.inputLabel, { color: colors.muted }]}>Artist</Text>
              <TextInput value={newArtist} onChangeText={setNewArtist} placeholder="Artist name" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]} />
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={[styles.inputLabel, { color: colors.muted }]}>Key</Text>
                  <TextInput value={newKey} onChangeText={setNewKey} placeholder="e.g. C" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]} />
                </View>
                <View style={styles.halfInput}>
                  <Text style={[styles.inputLabel, { color: colors.muted }]}>Tempo (BPM)</Text>
                  <TextInput value={newTempo} onChangeText={setNewTempo} placeholder="e.g. 120" placeholderTextColor={colors.muted} keyboardType="numeric" style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]} />
                </View>
              </View>
              <Text style={[styles.inputLabel, { color: colors.muted }]}>YouTube Link</Text>
              <TextInput value={newYoutubeUrl} onChangeText={setNewYoutubeUrl} placeholder="YouTube URL" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]} />
              <TextInput value={newSpotifyUrl} onChangeText={setNewSpotifyUrl} placeholder="Spotify URL"
              />
              <TextInput value={newAppleMusicUrl} onChangeText={setNewAppleMusicUrl} placeholder="Apple Music URL" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
 placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]} />
              <Text style={[styles.inputLabel, { color: colors.muted }]}>Lyrics</Text>
              <TextInput value={newLyrics} onChangeText={setNewLyrics} placeholder="Paste lyrics here..." placeholderTextColor={colors.muted} multiline style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]} />
            </ScrollView>
            <Pressable onPress={handleCreateSong} style={({ pressed }) => [styles.createButton, { backgroundColor: colors.primary }, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}>
              <Text style={styles.createButtonText}>Add Song</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Create Setlist Modal */}
      <Modal visible={showCreateSetlist} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.setlistModalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Create Setlist</Text>
              <Pressable onPress={() => { setShowCreateSetlist(false); resetSetlistForm(); }} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                <IconSymbol name="xmark" size={24} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Setlist Title */}
              <Text style={[styles.inputLabel, { color: colors.muted }]}>Setlist Title *</Text>
              <TextInput
                value={setlistTitle}
                onChangeText={setSetlistTitle}
                placeholder="e.g. Sunday Morning Worship"
                placeholderTextColor={colors.muted}
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              />

              {/* Date */}
              <Text style={[styles.inputLabel, { color: colors.muted }]}>Date (optional)</Text>
              <TextInput
                value={setlistDate}
                onChangeText={setSetlistDate}
                placeholder="e.g. 2026-04-20"
                placeholderTextColor={colors.muted}
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              />

              {/* Song Picker */}
              <Text style={[styles.inputLabel, { color: colors.muted }]}>
                Select Songs ({selectedSongIds.length} selected)
              </Text>

              {/* Song search */}
              <View style={[styles.pickerSearch, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
                <TextInput
                  value={songSearch}
                  onChangeText={setSongSearch}
                  placeholder="Search songs to add..."
                  placeholderTextColor={colors.muted}
                  style={[styles.pickerSearchInput, { color: colors.foreground }]}
                />
              </View>

              {/* Selected songs order preview */}
              {selectedSongIds.length > 0 && (
                <View style={[styles.selectedPreview, { backgroundColor: colors.primary + "08", borderColor: colors.primary + "25" }]}>
                  <Text style={[styles.selectedPreviewTitle, { color: colors.primary }]}>Setlist Order</Text>
                  {selectedSongIds.map((songId, idx) => {
                    const s = (songsList || []).find(x => x.id === songId);
                    return s ? (
                      <View key={songId} style={styles.selectedRow}>
                        <View style={[styles.orderBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.orderBadgeText}>{idx + 1}</Text>
                        </View>
                        <Text style={[styles.selectedSongName, { color: colors.foreground }]} numberOfLines={1}>{s.title}</Text>
                        <Pressable
                          onPress={() => toggleSongSelection(songId)}
                          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                        >
                          <IconSymbol name="xmark" size={16} color={colors.muted} />
                        </Pressable>
                      </View>
                    ) : null;
                  })}
                </View>
              )}

              {/* Song list */}
              {(songsList || []).length === 0 ? (
                <View style={[styles.noSongsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.noSongsText, { color: colors.muted }]}>No songs in your library yet. Add songs first, then create a setlist.</Text>
                </View>
              ) : (
                <View style={styles.pickerList}>
                  {pickerSongs.map((item) => {
                    const isSelected = selectedSongIds.includes(item.id);
                    const orderNum = selectedSongIds.indexOf(item.id) + 1;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => toggleSongSelection(item.id)}
                        style={({ pressed }) => [
                          styles.pickerItem,
                          { backgroundColor: isSelected ? colors.primary + "12" : colors.surface, borderColor: isSelected ? colors.primary + "40" : colors.border },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <View style={[styles.pickerCheck, { backgroundColor: isSelected ? colors.primary : colors.surface, borderColor: isSelected ? colors.primary : colors.border }]}>
                          {isSelected ? (
                            <Text style={styles.pickerCheckNum}>{orderNum}</Text>
                          ) : null}
                        </View>
                        <View style={styles.pickerInfo}>
                          <Text style={[styles.pickerTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
                          {item.artist && <Text style={[styles.pickerArtist, { color: colors.muted }]} numberOfLines={1}>{item.artist}</Text>}
                        </View>
                        {item.songKey && (
                          <View style={[styles.pickerKeyBadge, { backgroundColor: colors.primary + "15" }]}>
                            <Text style={[styles.pickerKeyText, { color: colors.primary }]}>{item.songKey}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <Pressable
              onPress={handleCreateSetlist}
              disabled={!setlistTitle.trim() || createSetlist.isPending}
              style={({ pressed }) => [
                styles.createButton,
                { backgroundColor: setlistTitle.trim() ? colors.primary : colors.muted },
                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.createButtonText}>
                {createSetlist.isPending ? "Creating..." : `Create Setlist${selectedSongIds.length > 0 ? ` (${selectedSongIds.length} songs)` : ""}`}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 32, fontWeight: "800" },
  addButton: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  segmentedControl: { flexDirection: "row", marginHorizontal: 20, borderRadius: 12, padding: 4, marginBottom: 12 },
  segmentButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  segmentText: { fontSize: 14, fontWeight: "700" },
  searchContainer: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginBottom: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  listContent: { paddingHorizontal: 20, paddingBottom: 32, gap: 8 },
  songCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  songIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  songInfo: { flex: 1, gap: 2 },
  songTitle: { fontSize: 16, fontWeight: "600" },
  songArtist: { fontSize: 13 },
  songMeta: { alignItems: "flex-end", gap: 4, flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end" },
  keyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  keyText: { fontSize: 12, fontWeight: "700" },
  tempoText: { fontSize: 11 },
  emptyState: { padding: 48, borderRadius: 20, borderWidth: 1, alignItems: "center", gap: 8, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySubtitle: { fontSize: 14 },
  // Modals
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 24, paddingBottom: 40, maxHeight: "85%" },
  setlistModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 24, paddingBottom: 40, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: "800" },
  modalBody: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 16 },
  input: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  textArea: { minHeight: 120, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12 },
  halfInput: { flex: 1 },
  createButton: { paddingVertical: 16, borderRadius: 50, alignItems: "center" },
  createButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  // Setlist song picker
  pickerSearch: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 8, marginTop: 8 },
  pickerSearchInput: { flex: 1, fontSize: 14, padding: 0 },
  selectedPreview: { marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  selectedPreviewTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  selectedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  orderBadgeText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  selectedSongName: { flex: 1, fontSize: 14, fontWeight: "500" },
  noSongsBox: { marginTop: 12, padding: 20, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  noSongsText: { fontSize: 14, textAlign: "center" },
  pickerList: { marginTop: 8, gap: 6 },
  pickerItem: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
  pickerCheck: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  pickerCheckNum: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  pickerInfo: { flex: 1, gap: 1 },
  pickerTitle: { fontSize: 15, fontWeight: "600" },
  pickerArtist: { fontSize: 12 },
  pickerKeyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pickerKeyText: { fontSize: 11, fontWeight: "700" },
});
