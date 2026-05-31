import React, { useState, useEffect } from "react";
import { Text, View, Pressable, StyleSheet, ScrollView, Linking, Platform, TextInput, Alert, Modal, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
  "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bm"];



function parseSongAssignments(notes?: string | null) {
  if (!notes) return [];

  const roles = [
    "Lead Vocal",
    "Harmony",
    "Soprano",
    "Alto",
    "Tenor",
    "Choir",
    "Keys",
    "Piano",
    "Organ",
    "Drums",
    "Bass",
    "Guitar",
    "MD",
    "Worship Leader",
  ];

  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.+?)\s*[:\-]\s*(.+)$/);
      if (!match) return null;

      const role = match[1].trim();
      const person = match[2].trim();
      const isAssignment = roles.some((r) =>
        role.toLowerCase().includes(r.toLowerCase())
      );

      return isAssignment ? { role, person } : null;
    })
    .filter(Boolean) as { role: string; person: string }[];
}

function getAssignmentEmoji(role: string) {
  const r = role.toLowerCase();

  if (r.includes("vocal") || r.includes("harmony") || r.includes("choir") || r.includes("soprano") || r.includes("alto") || r.includes("tenor")) return "🎤";
  if (r.includes("keys") || r.includes("piano") || r.includes("organ")) return "🎹";
  if (r.includes("drums")) return "🥁";
  if (r.includes("bass")) return "🎸";
  if (r.includes("guitar")) return "🎸";
  if (r.includes("md") || r.includes("leader")) return "⭐";

  return "🎶";
}

function parseLyricSections(lyrics: string) {
  const lines = lyrics.split("\n");
  const sections: { label: string; lines: string[] }[] = [];
  let current = { label: "LYRICS", lines: [] as string[] };

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(
      /^\[(VERSE|CHORUS|PRE CHORUS|BRIDGE|TAG|INTRO|OUTRO|VAMP|ENDING)([\s\-A-Z0-9&]*)?\]$/i
    );

    if (match) {
      if (current.lines.length > 0 || current.label !== "LYRICS") {
        sections.push(current);
      }
      current = { label: trimmed.replace("[", "").replace("]", "").toUpperCase(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }

  if (current.lines.length > 0 || current.label !== "LYRICS") {
    sections.push(current);
  }

  return sections;
}

function getSectionColor(label: string) {
  const l = label.toUpperCase();

  if (l.includes("VERSE")) return "#3B82F6";
  if (l.includes("PRE CHORUS")) return "#8B5CF6";
  if (l.includes("CHORUS")) return "#22C55E";
  if (l.includes("BRIDGE")) return "#F59E0B";
  if (l.includes("TAG")) return "#EF4444";
  if (l.includes("VAMP")) return "#A855F7";

  return "#64748B";
}

export default function SongDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { data: song, refetch } = trpc.songs.byId.useQuery({ id: Number(id) }, { enabled: !!id });

  const [showEdit, setShowEdit] = useState(false);
  const [editLyrics, setEditLyrics] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editKey, setEditKey] = useState("");
  const [editTempo, setEditTempo] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editYoutubeUrl, setEditYoutubeUrl] = useState("");
  const [editSpotifyUrl, setEditSpotifyUrl] = useState("");
  const [editAppleMusicUrl, setEditAppleMusicUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Audio player for the song's audio file
  const audioSource = song?.audioUrl ? { uri: song.audioUrl } : undefined;
  const player = useAudioPlayer(audioSource);
  const status = useAudioPlayerStatus(player);

  const updateMutation = trpc.songs.update.useMutation({
    onSuccess: () => {
      refetch();
      setShowEdit(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Song has been updated.");
    },
    onError: () => {
      Alert.alert("Error", "Could not update song. Please try again.");
    },
  });
  const deleteMutation = trpc.songs.delete.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: () => Alert.alert("Error", "Could not delete song."),
  });
  const uploadAudioMutation = trpc.songs.uploadAudio.useMutation({
    onSuccess: () => {
      refetch();
      setUploading(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Uploaded", "Audio file has been attached to this song.");
    },
    onError: (err) => {
      console.error("Audio upload failed:", err);
      setUploading(false);
      Alert.alert(
        "Audio Upload Failed",
        err?.message || "Could not upload audio file. Please try again."
      );
    },
  });

  const handleDelete = () => {
    Alert.alert(
      "Delete Song",
      "Are you sure you want to delete this song? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate({ id: Number(id) }) },
      ]
    );
  };

  const handleRemoveAudio = () => {
    const removeAudio = () => {
      player.pause();
      updateMutation.mutate({ id: Number(id), audioUrl: null });
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm("Remove the audio file from this song?");
      if (confirmed) removeAudio();
      return;
    }

    Alert.alert(
      "Remove Audio",
      "Remove the audio file from this song?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: removeAudio },
      ]
    );
  };

  const handlePickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (asset.size && asset.size > 50 * 1024 * 1024) {
        Alert.alert("File Too Large", "Audio files must be under 50 MB.");
        return;
      }

      setUploading(true);

      // On web, use base64 from the asset directly if available
      let base64Data: string | undefined;
      if (Platform.OS === "web" && asset.base64) {
        base64Data = asset.base64;
      } else if (Platform.OS !== "web") {
        // On native, read the file as base64
        base64Data = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        // Web fallback: read from File object
        if (asset.file) {
          const arrayBuffer = await asset.file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          base64Data = btoa(binary);
        }
      }

      if (!base64Data) {
        setUploading(false);
        Alert.alert("Error", "Could not read the audio file.");
        return;
      }

      uploadAudioMutation.mutate({
        songId: Number(id),
        fileBase64: base64Data,
        fileName: asset.name || `audio_${Date.now()}.mp3`,
        mimeType: asset.mimeType || "audio/mpeg",
      });
    } catch (err: any) {
      console.error("Audio picker failed:", err);
      setUploading(false);
      Alert.alert(
        "Audio Picker Failed",
        err?.message || "Could not pick audio file."
      );
    }
  };

  useEffect(() => {
    if (song && showEdit) {
      setEditTitle(song.title || "");
      setEditArtist(song.artist || "");
      setEditLyrics(song.lyrics || "");
      setEditNotes(song.notes || "");
      setEditKey(song.songKey || "");
      setEditTempo(song.tempo ? String(song.tempo) : "");
      setEditYoutubeUrl(song.youtubeUrl || "");
      setEditSpotifyUrl(song.spotifyUrl || "");
      setEditAppleMusicUrl((song as any).appleMusicUrl || "");
    }
  }, [song, showEdit]);

  const handleSave = () => {
    if (!editTitle.trim()) {
      Alert.alert("Required", "Song title cannot be empty.");
      return;
    }
    updateMutation.mutate({
      id: Number(id),
      title: editTitle.trim(),
      artist: editArtist.trim() || undefined,
      lyrics: editLyrics.trim() || undefined,
      notes: editNotes.trim() || undefined,
      songKey: editKey || undefined,
      tempo: editTempo ? Number(editTempo) : undefined,
      youtubeUrl: editYoutubeUrl.trim() || undefined,
      spotifyUrl: editSpotifyUrl.trim() || undefined,
      appleMusicUrl: editAppleMusicUrl.trim() || undefined,
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (status.playing) {
      player.pause();
    } else {
      if (status.currentTime >= status.duration && status.duration > 0) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  if (!song) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, { backgroundColor: colors.surface }, pressed && { opacity: 0.7 }]}>
          <IconSymbol name="arrow.left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Song Details</Text>
        <Pressable
          onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowEdit(true); }}
          style={({ pressed }) => [styles.editButton, { backgroundColor: colors.primary }, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
        >
          <IconSymbol name="pencil" size={16} color="#FFF" />
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.songHeader, { backgroundColor: colors.primary + "10" }]}>
          <View style={[styles.songIconBig, { backgroundColor: colors.primary + "25" }]}>
            <IconSymbol name="music.note" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.songTitle, { color: colors.foreground }]}>{song.title}</Text>
          {song.artist && <Text style={[styles.songArtist, { color: colors.muted }]}>{song.artist}</Text>}
        </View>

        {/* Audio Player / Upload */}
        {song.audioUrl ? (
          <View style={[styles.audioCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.audioHeader}>
              <IconSymbol name="waveform" size={20} color={colors.primary} />
              <Text style={[styles.audioTitle, { color: colors.foreground }]}>Audio</Text>
              <Pressable onPress={handleRemoveAudio} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                <IconSymbol name="trash" size={16} color={colors.error} />
              </Pressable>
            </View>
            {Platform.OS === "web" ? (
              <View style={styles.webAudioWrap}>
                {React.createElement("audio", {
                  controls: true,
                  src: song.audioUrl,
                  style: { width: "100%" },
                })}
              </View>
            ) : (
              <View style={styles.audioControls}>
                <Pressable
                  onPress={handlePlayPause}
                  style={({ pressed }) => [styles.playButton, { backgroundColor: colors.primary }, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
                >
                  <IconSymbol name={status.playing ? "pause.fill" : "play.fill"} size={24} color="#FFF" />
                </Pressable>
                <View style={styles.audioProgress}>
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { backgroundColor: colors.primary, width: status.duration > 0 ? `${(status.currentTime / status.duration) * 100}%` : "0%" },
                      ]}
                    />
                  </View>
                  <View style={styles.timeRow}>
                    <Text style={[styles.timeText, { color: colors.muted }]}>{formatTime(status.currentTime)}</Text>
                    <Text style={[styles.timeText, { color: colors.muted }]}>{formatTime(status.duration)}</Text>
                  </View>
                </View>
              </View>
            )}

            <Pressable
              onPress={handleRemoveAudio}
              style={({ pressed }) => [
                styles.removeAudioButton,
                {
                  backgroundColor: colors.error + "12",
                  borderColor: colors.error + "35",
                },
                pressed && { opacity: 0.75 },
              ]}
            >
              <IconSymbol name="trash" size={16} color={colors.error} />
              <Text style={[styles.removeAudioText, { color: colors.error }]}>
                Remove Audio
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handlePickAudio}
            disabled={uploading}
            style={({ pressed }) => [styles.uploadCard, { backgroundColor: colors.primary + "08", borderColor: colors.primary + "30" }, pressed && { opacity: 0.8 }]}
          >
            {uploading ? (
              <View style={styles.uploadContent}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.uploadText, { color: colors.primary }]}>Uploading audio...</Text>
              </View>
            ) : (
              <View style={styles.uploadContent}>
                <View style={[styles.uploadIcon, { backgroundColor: colors.primary + "20" }]}>
                  <IconSymbol name="icloud.and.arrow.up" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.uploadTitle, { color: colors.foreground }]}>Upload Audio</Text>
                <Text style={[styles.uploadSubtitle, { color: colors.muted }]}>MP3, WAV, M4A (max 50 MB)</Text>
              </View>
            )}
          </Pressable>
        )}

        {/* Meta Info */}
        <View style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {song.songKey && (
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Key</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>{song.songKey}</Text>
            </View>
          )}
          {song.tempo && (
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Tempo</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>{song.tempo} BPM</Text>
            </View>
          )}
          {!song.songKey && !song.tempo && (
            <Text style={[styles.noMeta, { color: colors.muted }]}>No key or tempo set</Text>
          )}
        </View>

        {/* Lyrics */}
        {song.lyrics ? (
          <View style={[styles.lyricsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Lyrics</Text>
            </View>
            {parseLyricSections(song.lyrics).map((section, index) => {
              const sectionColor = getSectionColor(section.label);

              return (
                <View
                  key={`${section.label}-${index}`}
                  style={[
                    styles.lyricSectionBlock,
                    {
                      borderColor: sectionColor + "55",
                      backgroundColor: sectionColor + "10",
                    },
                  ]}
                >
                  <Text style={[styles.lyricSectionLabel, { color: sectionColor }]}>
                    {section.label}
                  </Text>
                  <Text style={[styles.lyricsText, { color: colors.foreground }]}>
                    {section.lines.join("\n").trim()}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Pressable
            onPress={() => { setShowEdit(true); }}
            style={({ pressed }) => [styles.lyricsCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.8 }]}
          >
            <View style={styles.emptyLyrics}>
              <IconSymbol name="pencil" size={20} color={colors.muted} />
              <Text style={[styles.noLyrics, { color: colors.muted }]}>Tap to add lyrics</Text>
            </View>
          </Pressable>
        )}

        {/* YouTube Link */}
        {song.youtubeUrl && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Linking.openURL(song.youtubeUrl!);
            }}
            style={({ pressed }) => [styles.youtubeCard, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
          >
            <View style={styles.youtubeIcon}>
              <IconSymbol name="play.fill" size={24} color="#FFF" />
            </View>
            <View style={styles.youtubeContent}>
              <Text style={styles.youtubeTitle}>Watch on YouTube</Text>
              <Text style={styles.youtubeUrl} numberOfLines={1}>{song.youtubeUrl}</Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color="#FFF" style={{ opacity: 0.6 }} />
          </Pressable>
        )}

        {/* Spotify Link */}
        {song.spotifyUrl && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Linking.openURL(song.spotifyUrl!);
            }}
            style={({ pressed }) => [styles.spotifyCard, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
          >
            <View style={styles.spotifyIcon}>
              <IconSymbol name="music.note" size={24} color="#FFF" />
            </View>
            <View style={styles.spotifyContent}>
              <Text style={styles.spotifyTitle}>Listen on Spotify</Text>
              <Text style={styles.spotifyUrl} numberOfLines={1}>{song.spotifyUrl}</Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color="#FFF" style={{ opacity: 0.6 }} />
          </Pressable>
        )}

        {song.spotifyUrl && (
          <Pressable
            onPress={() => Linking.openURL(song.spotifyUrl!)}
            style={({ pressed }) => [styles.spotifyCard, pressed && { opacity: 0.8 }]}
          >
            <View style={styles.spotifyIcon}>
              <IconSymbol name="music.note" size={24} color="#FFF" />
            </View>
            <View style={styles.spotifyContent}>
              <Text style={styles.spotifyTitle}>Open in Apple Music</Text>
              <Text style={styles.spotifyUrl} numberOfLines={1}>{song.spotifyUrl}</Text>
            </View>
          </Pressable>
        )}

        {/* Song Assignments */}
        {parseSongAssignments(song.notes).length > 0 && (
          <View
            style={[
              styles.assignmentCard,
              {
                backgroundColor: "#F59E0B10",
                borderColor: "#F59E0B45",
              },
            ]}
          >
            <Text style={[styles.assignmentTitle, { color: colors.foreground }]}>
              🎤 Song Assignments
            </Text>

            {parseSongAssignments(song.notes).map((assignment, index) => (
              <View key={index} style={styles.assignmentRow}>
                <Text style={styles.assignmentEmoji}>
                  {getAssignmentEmoji(assignment.role)}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.assignmentRole, { color: colors.foreground }]}>
                    {assignment.role}
                  </Text>
                  <Text style={[styles.assignmentPerson, { color: colors.muted }]}>
                    {assignment.person}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Rehearsal Notes */}
        {song.notes ? (
          <View
            style={[
              styles.rehearsalCard,
              {
                backgroundColor: "#7C3AED10",
                borderColor: "#7C3AED40",
              },
            ]}
          >
            <View style={styles.rehearsalHeader}>
              <Text style={styles.rehearsalEmoji}>🎤</Text>
              <Text
                style={[
                  styles.rehearsalTitle,
                  { color: colors.foreground },
                ]}
              >
                Rehearsal Notes
              </Text>
            </View>

            {song.notes
              .split("\n")
              .filter((line) => line.trim())
              .map((line, index) => (
                <View key={index} style={styles.rehearsalRow}>
                  <Text style={styles.rehearsalBullet}>•</Text>
                  <Text
                    style={[
                      styles.rehearsalText,
                      { color: colors.foreground },
                    ]}
                  >
                    {line}
                  </Text>
                </View>
              ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowEdit(false)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                <Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Song</Text>
              <Pressable
                onPress={handleSave}
                disabled={!editTitle.trim() || updateMutation.isPending}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.modalSave, { color: editTitle.trim() ? colors.primary : colors.muted }]}>
                  {updateMutation.isPending ? "..." : "Save"}
                </Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Title */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Title *</Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Song title"
                  placeholderTextColor={colors.muted}
                  style={[styles.formInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                />
              </View>

              {/* Artist */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Artist</Text>
                <TextInput
                  value={editArtist}
                  onChangeText={setEditArtist}
                  placeholder="Artist name"
                  placeholderTextColor={colors.muted}
                  style={[styles.formInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                />
              </View>

              {/* Key */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Key</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.keyScroll}>
                  {KEYS.map((k) => (
                    <Pressable
                      key={k}
                      onPress={() => {
                        setEditKey(editKey === k ? "" : k);
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={({ pressed }) => [
                        styles.keyChip,
                        { borderColor: editKey === k ? colors.primary : colors.border, backgroundColor: editKey === k ? colors.primary + "20" : colors.surface },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[styles.keyChipText, { color: editKey === k ? colors.primary : colors.foreground }]}>{k}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Tempo */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Tempo (BPM)</Text>
                <TextInput
                  value={editTempo}
                  onChangeText={(t) => setEditTempo(t.replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 120"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  style={[styles.formInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border, width: 120 }]}
                />
              </View>

              {/* Lyrics */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Lyrics</Text>
                <TextInput
                  value={editLyrics}
                  onChangeText={setEditLyrics}
                  placeholder="Paste or type lyrics here..."
                  placeholderTextColor={colors.muted}
                  multiline
                  style={[styles.formTextAreaLarge, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                />
              </View>

              {/* Arrangement Notes / Chord Chart */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Arrangement Notes / Chord Chart</Text>
                <TextInput
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder={"e.g. Intro: G - D - Em - C\nVerse 1: Start soft, build to chorus..."}
                  placeholderTextColor={colors.muted}
                  multiline
                  style={[styles.formTextArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                />
              </View>

              {/* YouTube URL */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>YouTube Link</Text>
                <TextInput
                  value={editYoutubeUrl}
                  onChangeText={setEditYoutubeUrl}
                  placeholder="https://youtube.com/watch?v=..."
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  keyboardType="url"
                  style={[styles.formInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                />
              </View>

              {/* Spotify URL */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Spotify Link</Text>
                <TextInput
                  value={editSpotifyUrl}
                  onChangeText={setEditSpotifyUrl}
                  placeholder="https://open.spotify.com/track/..."
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  keyboardType="url"
                  style={[styles.formInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                />
              </View>

              {/* Delete Song */}
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [styles.deleteButton, { backgroundColor: "#EF444415", borderColor: "#EF444440" }, pressed && { opacity: 0.7 }]}
              >
                <IconSymbol name="trash" size={18} color="#EF4444" />
                <Text style={styles.deleteText}>Delete Song</Text>
              </Pressable>

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
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  songHeader: { padding: 24, borderRadius: 20, alignItems: "center", gap: 10 },
  songIconBig: { width: 72, height: 72, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  songTitle: { fontSize: 24, fontWeight: "800", textAlign: "center" },
  songArtist: { fontSize: 16, fontWeight: "500" },
  // Audio player
  audioCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  audioHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  audioTitle: { fontSize: 16, fontWeight: "700", flex: 1 },
  audioControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  playButton: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  audioProgress: { flex: 1, gap: 4 },
  progressBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  timeText: { fontSize: 11, fontWeight: "500" },
  // Upload card
  uploadCard: { padding: 24, borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed" },
  uploadContent: { alignItems: "center", gap: 8 },
  uploadIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  uploadTitle: { fontSize: 16, fontWeight: "700" },
  uploadSubtitle: { fontSize: 13 },
  uploadText: { fontSize: 14, fontWeight: "600" },
  // Meta
  metaCard: { flexDirection: "row", padding: 16, borderRadius: 16, borderWidth: 1, justifyContent: "space-around" },
  metaItem: { alignItems: "center", gap: 4 },
  metaLabel: { fontSize: 12, fontWeight: "600" },
  metaValue: { fontSize: 18, fontWeight: "800" },
  noMeta: { fontSize: 14, textAlign: "center", paddingVertical: 8 },
  lyricsCard: { padding: 20, borderRadius: 16, borderWidth: 1, gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  lyricsText: { fontSize: 15, lineHeight: 24, fontFamily: "monospace" },
  noLyrics: { fontSize: 14, textAlign: "center" },
  emptyLyrics: { alignItems: "center", gap: 8, paddingVertical: 16 },
  notesCard: { padding: 20, borderRadius: 16, borderWidth: 1, gap: 8 },
  notesText: { fontSize: 14, lineHeight: 20 },

  assignmentCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  assignmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  assignmentEmoji: {
    fontSize: 22,
  },
  assignmentRole: {
    fontSize: 14,
    fontWeight: "800",
  },
  assignmentPerson: {
    fontSize: 14,
    marginTop: 2,
  },

  rehearsalCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  rehearsalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rehearsalEmoji: {
    fontSize: 20,
  },
  rehearsalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  rehearsalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  rehearsalBullet: {
    fontSize: 18,
    color: "#7C3AED",
    fontWeight: "800",
    marginTop: -1,
  },
  rehearsalText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  youtubeCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, backgroundColor: "#FF0000", gap: 14 },
  youtubeIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  youtubeContent: { flex: 1, gap: 2 },
  youtubeTitle: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  youtubeUrl: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  spotifyCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, backgroundColor: "#1DB954", gap: 14 },
  spotifyIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  spotifyContent: { flex: 1, gap: 2 },
  spotifyTitle: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  spotifyUrl: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 24, paddingBottom: 40, maxHeight: "92%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalCancel: { fontSize: 16 },
  modalSave: { fontSize: 16, fontWeight: "700" },
  formScroll: { paddingBottom: 20 },
  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 13, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 },
  formInput: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  formTextArea: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 16, minHeight: 100, textAlignVertical: "top" },
  formTextAreaLarge: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 15, minHeight: 200, textAlignVertical: "top", fontFamily: "monospace", lineHeight: 22 },
  keyScroll: { gap: 8, paddingVertical: 4 },
  keyChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, minWidth: 44, alignItems: "center" },
  keyChipText: { fontSize: 14, fontWeight: "700" },
  deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 14, borderWidth: 1, gap: 8, marginTop: 12 },
  deleteText: { fontSize: 15, fontWeight: "700", color: "#EF4444" },
});
