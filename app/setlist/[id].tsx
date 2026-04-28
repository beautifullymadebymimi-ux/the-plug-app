import { Text, View, Pressable, StyleSheet, FlatList, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function SetlistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { data: setlist } = trpc.setlists.byId.useQuery({ id: Number(id) }, { enabled: !!id });
  const { data: setlistSongs } = trpc.setlists.songs.useQuery({ setlistId: Number(id) }, { enabled: !!id });

  const utils = trpc.useUtils();

  const removeMutation = trpc.setlists.removeSong.useMutation({
    onSuccess: () => utils.setlists.songs.invalidate(),
  });

  const removeSong = (rowId:number) => {
    Alert.alert("Remove Song","Remove this song from setlist?",[
      { text:"Cancel", style:"cancel" },
      { text:"Remove", style:"destructive", onPress:()=>removeMutation.mutate({id:rowId}) }
    ]);
  };


  if (!setlist) {
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
        
<Pressable onPress={() => removeSong(item.id)}>
  <IconSymbol name="trash" size={18} color="#ff4d4f" />
</Pressable>
</Pressable>

        <Text style={[styles.navTitle, { color: colors.foreground }]}>Setlist</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.headerSection}>
        <Text style={[styles.setlistTitle, { color: colors.foreground }]}>{setlist.title}</Text>
        {setlist.date && (
          <Text style={[styles.setlistDate, { color: colors.muted }]}>
            {new Date(setlist.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </Text>
        )}
        <Text style={[styles.songCount, { color: colors.primary }]}>
          {setlistSongs?.length || 0} songs
        </Text>
      </View>

      <Pressable
        onPress={() => router.push(`/songs?pickForSetlist=${id}` as any)}
        style={{
          marginHorizontal:20,
          marginBottom:14,
          backgroundColor:colors.primary,
          paddingVertical:14,
          borderRadius:14,
          alignItems:"center"
        }}>
        <Text style={{color:"white",fontWeight":"800"}}>+ Add Song</Text>
      </Pressable>

      <FlatList
        data={setlistSongs || []}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="music.note.list" size={48} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No songs in this setlist</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => item.songId && router.push(`/song/${item.songId}` as any)}
            style={({ pressed }) => [styles.songRow, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.orderBadge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.orderText, { color: colors.primary }]}>{index + 1}</Text>
            </View>
            <View style={styles.songInfo}>
              <Text style={[styles.songTitle, { color: colors.foreground }]} numberOfLines={1}>
                {item.song?.title || "Unknown Song"}
              </Text>
              {item.song?.artist && (
                <Text style={[styles.songArtist, { color: colors.muted }]} numberOfLines={1}>
                  {item.song.artist}
                </Text>
              )}
            </View>
            
<View style={{flexDirection:"row", gap:6}}>
{item.song?.youtubeUrl && <Text style={{fontSize:11,color:"#ff4444",fontWeight:"700"}}>YT</Text>}
{item.song?.spotifyUrl && <Text style={{fontSize:11,color:"#1DB954",fontWeight:"700"}}>SP</Text>}
{item.song?.appleMusicUrl && <Text style={{fontSize:11,color:"#fa2d48",fontWeight:"700"}}>AM</Text>}
{item.song?.audioUrl && <Text style={{fontSize:11,color:"#4da6ff",fontWeight:"700"}}>AUD</Text>}
</View>

{item.song?.songKey && (

              <View style={[styles.keyBadge, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.keyText, { color: colors.primary }]}>{item.song.songKey}</Text>
              </View>
            )}
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16 },
  navBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  navTitle: { fontSize: 17, fontWeight: "600" },
  headerSection: { paddingHorizontal: 20, paddingBottom: 20, gap: 4 },
  setlistTitle: { fontSize: 28, fontWeight: "800" },
  setlistDate: { fontSize: 15 },
  songCount: { fontSize: 14, fontWeight: "700", marginTop: 4 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 8 },
  songRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  orderBadge: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  orderText: { fontSize: 16, fontWeight: "800" },
  songInfo: { flex: 1, gap: 2 },
  songTitle: { fontSize: 16, fontWeight: "600" },
  songArtist: { fontSize: 13 },
  keyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  keyText: { fontSize: 12, fontWeight: "700" },
  emptyState: { padding: 48, borderRadius: 20, borderWidth: 1, alignItems: "center", gap: 8, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
});
