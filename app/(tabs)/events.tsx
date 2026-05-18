import { useState, useMemo, useCallback } from "react";
import {
  FlatList,
  Text,
  View,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { notifyNewEvent, scheduleEventReminder } from "@/lib/notifications";


const eventTypeColors: Record<string, string> = {
  rehearsal: "#3B82F6",
  service: "#8B5CF6",
  special: "#F59E0B",
  other: "#6B7280",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function EventsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newType, setNewType] = useState<"rehearsal" | "service" | "special" | "other">("rehearsal");
  const [eventImage, setEventImage] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Date/Time picker state
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [selectedHour, setSelectedHour] = useState(10);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedAmPm, setSelectedAmPm] = useState<"AM" | "PM">("AM");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [selectedYear, selectedMonth]);

  const selectedDateObj = useMemo(() => {
    let h = selectedHour;
    if (selectedAmPm === "PM" && h !== 12) h += 12;
    if (selectedAmPm === "AM" && h === 12) h = 0;
    return new Date(selectedYear, selectedMonth, selectedDay, h, selectedMinute);
  }, [selectedYear, selectedMonth, selectedDay, selectedHour, selectedMinute, selectedAmPm]);

  const formattedSelectedDate = useMemo(() => {
    return `${DAYS_OF_WEEK[selectedDateObj.getDay()]}, ${MONTHS[selectedMonth].slice(0, 3)} ${selectedDay}, ${selectedYear}`;
  }, [selectedDateObj, selectedMonth, selectedDay, selectedYear]);

  const formattedSelectedTime = useMemo(() => {
    return `${selectedHour}:${selectedMinute.toString().padStart(2, "0")} ${selectedAmPm}`;
  }, [selectedHour, selectedMinute, selectedAmPm]);

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

 const { data: eventsList, refetch } = trpc.events.list.useQuery(undefined, {
  refetchOnMount: "always",
  refetchOnWindowFocus: true,
});
useFocusEffect(
  useCallback(() => {
    refetch();
  }, [refetch])
);
  const createMutation = trpc.events.create.useMutation({
    onSuccess: (_data, variables) => {
      refetch();
      setShowCreate(false);
      resetForm();
      setIsCreating(false);
      notifyNewEvent(variables.title, variables.date, variables.location);
      scheduleEventReminder(variables.title, new Date(variables.date));
    },
    onError: () => {
      setIsCreating(false);
      Alert.alert("Error", "Could not create event. Please try again.");
    },
  });

  const resetForm = () => {
    setNewTitle("");
    setNewDesc("");
    setNewLocation("");
    setNewType("rehearsal");
    setEventImage(null);
    const n = new Date();
    setSelectedYear(n.getFullYear());
    setSelectedMonth(n.getMonth());
    setSelectedDay(n.getDate());
    setSelectedHour(10);
    setSelectedMinute(0);
    setSelectedAmPm("AM");
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 0.8,
        base64: true,
        allowsEditing: true,
        aspect: [16, 9],
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) { Alert.alert("Error", "Could not read the selected image."); return; }
      setEventImage({ uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType || "image/jpeg" });
    } catch (e) {
      Alert.alert("Error", "Something went wrong picking the image.");
    }
  };

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    createMutation.mutate({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      date: selectedDateObj.toISOString(),
      location: newLocation.trim() || undefined,
      type: newType,
      imageBase64: eventImage?.base64,
      imageMimeType: eventImage?.mimeType,
    });
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Events</Text>
        <Pressable
          onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCreate(true); }}
          style={({ pressed }) => [styles.addButton, { backgroundColor: colors.primary }, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
        >
          <IconSymbol name="plus" size={20} color="#FFF" />
        </Pressable>
      </View>

      <FlatList
        data={eventsList || []}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="calendar" size={48} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No events yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Tap + to create your first event</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/event/${item.id}` as any)}
            style={({ pressed }) => [styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
          >
            {(item as any).imageUrl && (
              <Image source={{ uri: (item as any).imageUrl }} style={styles.eventImage} />
            )}
            <View style={styles.eventCardBody}>
              <View style={styles.eventCardLeft}>
                <View style={[styles.dateBadge, { backgroundColor: eventTypeColors[item.type] + "20" }]}>
                  <Text style={[styles.dateMonth, { color: eventTypeColors[item.type] }]}>
                    {new Date(item.date).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
                  </Text>
                  <Text style={[styles.dateDay, { color: eventTypeColors[item.type] }]}>
                    {new Date(item.date).getDate()}
                  </Text>
                </View>
              </View>
              <View style={styles.eventCardRight}>
                <View style={[styles.typeBadge, { backgroundColor: eventTypeColors[item.type] }]}>
                  <Text style={styles.typeText}>{item.type}</Text>
                </View>
                <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
                <View style={styles.metaRow}>
                  <IconSymbol name="clock" size={13} color={colors.muted} />
                  <Text style={[styles.metaText, { color: colors.muted }]}>{formatDate(item.date)} at {formatTime(item.date)}</Text>
                </View>
                {item.location && (
                  <View style={styles.metaRow}>
                    <IconSymbol name="mappin" size={13} color={colors.muted} />
                    <Text style={[styles.metaText, { color: colors.muted }]} numberOfLines={1}>{item.location}</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
      />

      {/* Create Event Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={[styles.modalOverlay]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Event</Text>
              <Pressable onPress={() => { setShowCreate(false); resetForm(); }} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                <IconSymbol name="xmark" size={24} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Image Picker */}
              <Text style={[styles.inputLabel, { color: colors.muted }]}>Cover Image</Text>
              <Pressable
                onPress={handlePickImage}
                style={({ pressed }) => [styles.imagePicker, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
              >
                {eventImage ? (
                  <View style={styles.imagePreviewWrap}>
                    <Image source={{ uri: eventImage.uri }} style={styles.imagePreview} />
                    <Pressable onPress={() => setEventImage(null)} style={({ pressed }) => [styles.removeImageBtn, pressed && { opacity: 0.7 }]}>
                      <IconSymbol name="xmark" size={14} color="#FFF" />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <IconSymbol name="camera.fill" size={28} color={colors.muted} />
                    <Text style={[styles.imagePickerText, { color: colors.muted }]}>Add a cover photo</Text>
                  </View>
                )}
              </Pressable>

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Title</Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Event name"
                placeholderTextColor={colors.muted}
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              />

              {/* Date Picker */}
              <Text style={[styles.inputLabel, { color: colors.muted }]}>Date</Text>
              <Pressable
                onPress={() => { setShowDatePicker(!showDatePicker); setShowTimePicker(false); }}
                style={({ pressed }) => [styles.dateTimeButton, { backgroundColor: colors.surface, borderColor: showDatePicker ? colors.primary : colors.border }, pressed && { opacity: 0.8 }]}
              >
                <IconSymbol name="calendar" size={18} color={showDatePicker ? colors.primary : colors.muted} />
                <Text style={[styles.dateTimeText, { color: colors.foreground }]}>{formattedSelectedDate}</Text>
                <IconSymbol name={showDatePicker ? "chevron.up" : "chevron.down"} size={14} color={colors.muted} />
              </Pressable>

              {showDatePicker && (
                <View style={[styles.calendarContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {/* Month/Year Navigation */}
                  <View style={styles.calendarNav}>
                    <Pressable onPress={prevMonth} style={({ pressed }) => [styles.calNavBtn, pressed && { opacity: 0.6 }]}>
                      <IconSymbol name="arrow.left" size={16} color={colors.foreground} />
                    </Pressable>
                    <Text style={[styles.calMonthYear, { color: colors.foreground }]}>{MONTHS[selectedMonth]} {selectedYear}</Text>
                    <Pressable onPress={nextMonth} style={({ pressed }) => [styles.calNavBtn, pressed && { opacity: 0.6 }]}>
                      <IconSymbol name="chevron.right" size={16} color={colors.foreground} />
                    </Pressable>
                  </View>

                  {/* Day of week headers */}
                  <View style={styles.calWeekRow}>
                    {DAYS_OF_WEEK.map((d) => (
                      <View key={d} style={styles.calWeekCell}>
                        <Text style={[styles.calWeekText, { color: colors.muted }]}>{d}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Calendar grid */}
                  <View style={styles.calGrid}>
                    {calendarDays.map((day, idx) => (
                      <View key={idx} style={styles.calDayCell}>
                        {day !== null ? (
                          <Pressable
                            onPress={() => {
                              setSelectedDay(day);
                              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            style={({ pressed }) => [
                              styles.calDayBtn,
                              selectedDay === day && { backgroundColor: colors.primary },
                              pressed && { opacity: 0.7 },
                            ]}
                          >
                            <Text style={[
                              styles.calDayText,
                              { color: colors.foreground },
                              selectedDay === day && { color: "#FFF", fontWeight: "800" },
                            ]}>{day}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Time Picker */}
              <Text style={[styles.inputLabel, { color: colors.muted }]}>Time</Text>
              <Pressable
                onPress={() => { setShowTimePicker(!showTimePicker); setShowDatePicker(false); }}
                style={({ pressed }) => [styles.dateTimeButton, { backgroundColor: colors.surface, borderColor: showTimePicker ? colors.primary : colors.border }, pressed && { opacity: 0.8 }]}
              >
                <IconSymbol name="clock" size={18} color={showTimePicker ? colors.primary : colors.muted} />
                <Text style={[styles.dateTimeText, { color: colors.foreground }]}>{formattedSelectedTime}</Text>
                <IconSymbol name={showTimePicker ? "chevron.up" : "chevron.down"} size={14} color={colors.muted} />
              </Pressable>

              {showTimePicker && (
                <View style={[styles.timeContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {/* Hour */}
                  <View style={styles.timeColumn}>
                    <Text style={[styles.timeLabel, { color: colors.muted }]}>Hour</Text>
                    <View style={styles.timeScrollRow}>
                      <Pressable
                        onPress={() => setSelectedHour(h => h <= 1 ? 12 : h - 1)}
                        style={({ pressed }) => [styles.timeArrow, { backgroundColor: colors.background }, pressed && { opacity: 0.6 }]}
                      >
                        <IconSymbol name="chevron.up" size={16} color={colors.foreground} />
                      </Pressable>
                      <View style={[styles.timeValueBox, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
                        <Text style={[styles.timeValue, { color: colors.primary }]}>{selectedHour}</Text>
                      </View>
                      <Pressable
                        onPress={() => setSelectedHour(h => h >= 12 ? 1 : h + 1)}
                        style={({ pressed }) => [styles.timeArrow, { backgroundColor: colors.background }, pressed && { opacity: 0.6 }]}
                      >
                        <IconSymbol name="chevron.down" size={16} color={colors.foreground} />
                      </Pressable>
                    </View>
                  </View>

                  <Text style={[styles.timeColon, { color: colors.foreground }]}>:</Text>

                  {/* Minute */}
                  <View style={styles.timeColumn}>
                    <Text style={[styles.timeLabel, { color: colors.muted }]}>Min</Text>
                    <View style={styles.timeScrollRow}>
                      <Pressable
                        onPress={() => setSelectedMinute(m => m <= 0 ? 55 : m - 5)}
                        style={({ pressed }) => [styles.timeArrow, { backgroundColor: colors.background }, pressed && { opacity: 0.6 }]}
                      >
                        <IconSymbol name="chevron.up" size={16} color={colors.foreground} />
                      </Pressable>
                      <View style={[styles.timeValueBox, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
                        <Text style={[styles.timeValue, { color: colors.primary }]}>{selectedMinute.toString().padStart(2, "0")}</Text>
                      </View>
                      <Pressable
                        onPress={() => setSelectedMinute(m => m >= 55 ? 0 : m + 5)}
                        style={({ pressed }) => [styles.timeArrow, { backgroundColor: colors.background }, pressed && { opacity: 0.6 }]}
                      >
                        <IconSymbol name="chevron.down" size={16} color={colors.foreground} />
                      </Pressable>
                    </View>
                  </View>

                  {/* AM/PM */}
                  <View style={styles.timeColumn}>
                    <Text style={[styles.timeLabel, { color: colors.muted }]}>{" "}</Text>
                    <View style={styles.ampmColumn}>
                      <Pressable
                        onPress={() => { setSelectedAmPm("AM"); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={({ pressed }) => [
                          styles.ampmBtn,
                          { borderColor: selectedAmPm === "AM" ? colors.primary : colors.border, backgroundColor: selectedAmPm === "AM" ? colors.primary : "transparent" },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={[styles.ampmText, { color: selectedAmPm === "AM" ? "#FFF" : colors.muted }]}>AM</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => { setSelectedAmPm("PM"); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={({ pressed }) => [
                          styles.ampmBtn,
                          { borderColor: selectedAmPm === "PM" ? colors.primary : colors.border, backgroundColor: selectedAmPm === "PM" ? colors.primary : "transparent" },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={[styles.ampmText, { color: selectedAmPm === "PM" ? "#FFF" : colors.muted }]}>PM</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

              {/* Date/Time Summary */}
              <View style={[styles.dateTimeSummary, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
                <IconSymbol name="calendar" size={16} color={colors.primary} />
                <Text style={[styles.dateTimeSummaryText, { color: colors.primary }]}>
                  {formattedSelectedDate} at {formattedSelectedTime}
                </Text>
              </View>

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Description</Text>
              <TextInput
                value={newDesc}
                onChangeText={setNewDesc}
                placeholder="What's this event about?"
                placeholderTextColor={colors.muted}
                multiline
                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              />
              <Text style={[styles.inputLabel, { color: colors.muted }]}>Location</Text>
              <TextInput
                value={newLocation}
                onChangeText={setNewLocation}
                placeholder="Where?"
                placeholderTextColor={colors.muted}
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              />
              <Text style={[styles.inputLabel, { color: colors.muted }]}>Type</Text>
              <View style={styles.typeSelector}>
                {(["rehearsal", "service", "special", "other"] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setNewType(t)}
                    style={({ pressed }) => [
                      styles.typeOption,
                      { borderColor: newType === t ? eventTypeColors[t] : colors.border, backgroundColor: newType === t ? eventTypeColors[t] + "20" : "transparent" },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.typeOptionText, { color: newType === t ? eventTypeColors[t] : colors.muted }]}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ height: 16 }} />
            </ScrollView>
            <Pressable
              onPress={handleCreate}
              disabled={isCreating || !newTitle.trim()}
              style={({ pressed }) => [
                styles.createButton,
                { backgroundColor: newTitle.trim() ? colors.primary : colors.muted },
                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
              ]}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.createButtonText}>Create Event</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: "800" },
  addButton: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  listContent: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  eventCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  eventImage: { width: "100%", height: 140, resizeMode: "cover" },
  eventCardBody: { flexDirection: "row", padding: 16, gap: 14 },
  eventCardLeft: {},
  dateBadge: { width: 56, height: 56, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  dateMonth: { fontSize: 11, fontWeight: "700" },
  dateDay: { fontSize: 22, fontWeight: "800" },
  eventCardRight: { flex: 1, gap: 4 },
  typeBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  typeText: { color: "#FFF", fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  eventTitle: { fontSize: 17, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13 },
  emptyState: { padding: 48, borderRadius: 20, borderWidth: 1, alignItems: "center", gap: 8, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySubtitle: { fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 24, paddingBottom: 40, maxHeight: "92%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: "800" },
  modalBody: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 16, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  typeSelector: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  typeOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  typeOptionText: { fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  createButton: { paddingVertical: 16, borderRadius: 50, alignItems: "center" },
  createButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  // Image picker
  imagePicker: { borderRadius: 14, borderWidth: 1, borderStyle: "dashed", overflow: "hidden" },
  imagePickerPlaceholder: { paddingVertical: 28, alignItems: "center", gap: 8 },
  imagePickerText: { fontSize: 14, fontWeight: "500" },
  imagePreviewWrap: { position: "relative" },
  imagePreview: { width: "100%", height: 160, resizeMode: "cover" },
  removeImageBtn: { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  // Date/Time picker
  dateTimeButton: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  dateTimeText: { flex: 1, fontSize: 16, fontWeight: "500" },
  dateTimeSummary: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, gap: 8, marginTop: 16 },
  dateTimeSummaryText: { fontSize: 14, fontWeight: "600" },
  // Calendar
  calendarContainer: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 8 },
  calendarNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  calNavBtn: { padding: 6 },
  calMonthYear: { fontSize: 17, fontWeight: "700" },
  calWeekRow: { flexDirection: "row", marginBottom: 8 },
  calWeekCell: { flex: 1, alignItems: "center" },
  calWeekText: { fontSize: 12, fontWeight: "600" },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calDayCell: { width: "14.28%", aspectRatio: 1, justifyContent: "center", alignItems: "center", padding: 2 },
  calDayBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  calDayText: { fontSize: 15, fontWeight: "500" },
  // Time picker
  timeContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 8, gap: 8 },
  timeColumn: { alignItems: "center", gap: 8 },
  timeLabel: { fontSize: 12, fontWeight: "600" },
  timeScrollRow: { alignItems: "center", gap: 6 },
  timeArrow: { width: 36, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  timeValueBox: { width: 56, height: 48, borderRadius: 12, borderWidth: 1.5, justifyContent: "center", alignItems: "center" },
  timeValue: { fontSize: 24, fontWeight: "800" },
  timeColon: { fontSize: 28, fontWeight: "800", marginTop: 20 },
  ampmColumn: { gap: 6 },
  ampmBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  ampmText: { fontSize: 14, fontWeight: "700" },
});
