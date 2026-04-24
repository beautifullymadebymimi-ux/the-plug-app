import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "calendar": "event",
  "music.note.list": "queue-music",
  "person.2.fill": "group",
  "ellipsis.circle": "more-horiz",
  "plus": "add",
  "magnifyingglass": "search",
  "gear": "settings",
  "person.fill": "person",
  "photo.fill": "photo-library",
  "book.fill": "menu-book",
  "bubble.left.fill": "chat",
  "arrow.left": "arrow-back",
  "xmark": "close",
  "square.and.arrow.up": "share",
  "trash": "delete",
  "trash.fill": "delete-forever",
  "pencil": "edit",
  "heart.fill": "favorite",
  "clock": "schedule",
  "mappin": "place",
  "music.note": "music-note",
  "play.fill": "play-arrow",
  "checkmark.circle.fill": "check-circle",
  "exclamationmark.circle": "error-outline",
  "bell.fill": "notifications",
  "power": "power-settings-new",
  "plus.circle.fill": "add-circle",
  "folder.fill": "folder",
  "camera.fill": "camera-alt",
  "person.badge.plus": "person-add",
  "sun.max.fill": "light-mode",
  "moon.fill": "dark-mode",
  "link": "link",
  "paintbrush.fill": "brush",
  "chevron.up": "keyboard-arrow-up",
  "chevron.down": "keyboard-arrow-down",
  "xmark.circle.fill": "cancel",
  "person.crop.circle": "account-circle",
  "creditcard.fill": "payment",
  "dollarsign.circle.fill": "attach-money",
  "shield.fill": "admin-panel-settings",
  "doc.text.fill": "description",
  "person.fill.checkmark": "verified-user",
  "person.slash.fill": "person-off",
  "arrow.counterclockwise": "refresh",
  "waveform": "graphic-eq",
  "pause.fill": "pause",
  "stop.fill": "stop",
  "icloud.and.arrow.up": "cloud-upload",
  "checkmark": "check",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
