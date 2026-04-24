import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.resolve(__dirname, "..");

describe("Push Notifications Module", () => {
  it("notifications utility file exists", () => {
    const filePath = path.join(projectRoot, "lib/notifications.ts");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("exports registerForNotifications function", () => {
    const content = fs.readFileSync(path.join(projectRoot, "lib/notifications.ts"), "utf-8");
    expect(content).toContain("export async function registerForNotifications");
  });

  it("exports notifyNewEvent function", () => {
    const content = fs.readFileSync(path.join(projectRoot, "lib/notifications.ts"), "utf-8");
    expect(content).toContain("export async function notifyNewEvent");
  });

  it("exports notifyNewDevotional function", () => {
    const content = fs.readFileSync(path.join(projectRoot, "lib/notifications.ts"), "utf-8");
    expect(content).toContain("export async function notifyNewDevotional");
  });

  it("root layout imports and calls registerForNotifications", () => {
    const content = fs.readFileSync(path.join(projectRoot, "app/_layout.tsx"), "utf-8");
    expect(content).toContain('import { registerForNotifications } from "@/lib/notifications"');
    expect(content).toContain("registerForNotifications()");
  });

  it("events screen triggers notification on event creation", () => {
    const content = fs.readFileSync(path.join(projectRoot, "app/(tabs)/events.tsx"), "utf-8");
    expect(content).toContain("notifyNewEvent");
    expect(content).toContain("scheduleEventReminder");
  });
});

describe("Event Image Support", () => {
  it("events screen imports ImagePicker", () => {
    const content = fs.readFileSync(path.join(projectRoot, "app/(tabs)/events.tsx"), "utf-8");
    expect(content).toContain('import * as ImagePicker from "expo-image-picker"');
  });

  it("events screen sends imageBase64 in create mutation", () => {
    const content = fs.readFileSync(path.join(projectRoot, "app/(tabs)/events.tsx"), "utf-8");
    expect(content).toContain("imageBase64");
    expect(content).toContain("imageMimeType");
  });

  it("server router accepts imageBase64 for events", () => {
    const content = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf-8");
    expect(content).toContain("imageBase64: z.string().optional()");
    expect(content).toContain("storagePut");
  });

  it("events schema has imageUrl column", () => {
    const content = fs.readFileSync(path.join(projectRoot, "drizzle/schema.ts"), "utf-8");
    expect(content).toContain("imageUrl");
  });
});

describe("Create Devotional Form", () => {
  it("more.tsx contains devotional creation form", () => {
    const content = fs.readFileSync(path.join(projectRoot, "app/(tabs)/more.tsx"), "utf-8");
    expect(content).toContain("showDevotionalForm");
    expect(content).toContain("New Devotional");
    expect(content).toContain("handleCreateDevotional");
  });

  it("devotional creation triggers notification", () => {
    const content = fs.readFileSync(path.join(projectRoot, "app/(tabs)/more.tsx"), "utf-8");
    expect(content).toContain("notifyNewDevotional");
  });
});

describe("Photo/Video Upload", () => {
  it("more.tsx imports ImagePicker", () => {
    const content = fs.readFileSync(path.join(projectRoot, "app/(tabs)/more.tsx"), "utf-8");
    expect(content).toContain('import * as ImagePicker from "expo-image-picker"');
  });

  it("more.tsx has upload handler", () => {
    const content = fs.readFileSync(path.join(projectRoot, "app/(tabs)/more.tsx"), "utf-8");
    expect(content).toContain("handlePickMedia");
    expect(content).toContain("launchImageLibraryAsync");
  });
});

describe("Google Drive Integration", () => {
  it("more.tsx has Google Drive section with user's folder link", () => {
    const content = fs.readFileSync(path.join(projectRoot, "app/(tabs)/more.tsx"), "utf-8");
    expect(content).toContain("Google Drive");
    expect(content).toContain("https://drive.google.com/drive/folders/1sd5-BsEpi3AZWa0V7b7RhPAP4WScB2t7");
  });
});

describe("Member Signup Feature", () => {
  it("should have member signup UI in members tab", () => {
    const membersScreen = fs.readFileSync(path.join(projectRoot, "app/(tabs)/members.tsx"), "utf-8");
    expect(membersScreen).toContain("Join The Plug");
    expect(membersScreen).toContain("instrument");
    expect(membersScreen).toContain("role");
  });

  it("should have name column in memberProfiles schema", () => {
    const schema = fs.readFileSync(path.join(projectRoot, "drizzle/schema.ts"), "utf-8");
    expect(schema).toContain("memberProfiles");
    expect(schema).toContain("name");
    expect(schema).toContain("instrument");
    expect(schema).toContain("role");
  });

  it("should have member signup API route", () => {
    const routers = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf-8");
    expect(routers).toContain("members");
    expect(routers).toContain("signup");
  });

  it("should have members.byId route for detail screen", () => {
    const routers = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf-8");
    expect(routers).toContain("byId");
  });
});

describe("YouTube Link Support for Songs", () => {
  it("should have YouTube URL field in create song form", () => {
    const songsScreen = fs.readFileSync(path.join(projectRoot, "app/(tabs)/songs.tsx"), "utf-8");
    expect(songsScreen).toContain("newYoutubeUrl");
    expect(songsScreen).toContain("YouTube Link");
  });

  it("should pass youtubeUrl in song create mutation", () => {
    const songsScreen = fs.readFileSync(path.join(projectRoot, "app/(tabs)/songs.tsx"), "utf-8");
    expect(songsScreen).toContain("youtubeUrl: newYoutubeUrl");
  });

  it("should display YouTube badge on song cards", () => {
    const songsScreen = fs.readFileSync(path.join(projectRoot, "app/(tabs)/songs.tsx"), "utf-8");
    expect(songsScreen).toContain("item.youtubeUrl");
    expect(songsScreen).toContain("YT");
  });

  it("should have YouTube link button in song detail", () => {
    const songDetail = fs.readFileSync(path.join(projectRoot, "app/song/[id].tsx"), "utf-8");
    expect(songDetail).toContain("Watch on YouTube");
    expect(songDetail).toContain("Linking.openURL");
  });

  it("should have youtubeUrl in songs router", () => {
    const routers = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf-8");
    expect(routers).toContain("youtubeUrl");
  });
});

describe("Dark/Light Mode Toggle", () => {
  it("should have dark mode toggle in settings section", () => {
    const moreScreen = fs.readFileSync(path.join(projectRoot, "app/(tabs)/more.tsx"), "utf-8");
    expect(moreScreen).toContain("Dark Mode");
    expect(moreScreen).toContain("Switch");
    expect(moreScreen).toContain("useThemeContext");
    expect(moreScreen).toContain("setColorScheme");
  });

  it("should persist theme preference with AsyncStorage", () => {
    const themeProvider = fs.readFileSync(path.join(projectRoot, "lib/theme-provider.tsx"), "utf-8");
    expect(themeProvider).toContain("AsyncStorage");
    expect(themeProvider).toContain("THEME_STORAGE_KEY");
    expect(themeProvider).toContain("getItem");
    expect(themeProvider).toContain("setItem");
  });

  it("should have Settings menu item with gear icon", () => {
    const moreScreen = fs.readFileSync(path.join(projectRoot, "app/(tabs)/more.tsx"), "utf-8");
    expect(moreScreen).toContain('"Settings"');
    expect(moreScreen).toContain('"gear"');
  });

  it("should have moon.fill icon mapped", () => {
    const iconSymbol = fs.readFileSync(path.join(projectRoot, "components/ui/icon-symbol.tsx"), "utf-8");
    expect(iconSymbol).toContain('"moon.fill"');
    expect(iconSymbol).toContain('"dark-mode"');
  });
});

describe("Member Detail Screen", () => {
  it("should use members.byId query", () => {
    const memberDetail = fs.readFileSync(path.join(projectRoot, "app/member/[id].tsx"), "utf-8");
    expect(memberDetail).toContain("members.byId");
  });

  it("should display role badge and instrument", () => {
    const memberDetail = fs.readFileSync(path.join(projectRoot, "app/member/[id].tsx"), "utf-8");
    expect(memberDetail).toContain("member.role");
    expect(memberDetail).toContain("member.instrument");
  });
});

describe("Auth Removal", () => {
  it("root layout does not include login screen", () => {
    const content = fs.readFileSync(path.join(projectRoot, "app/_layout.tsx"), "utf-8");
    expect(content).not.toContain('name="login"');
  });

  it("server routers use publicProcedure only", () => {
    const content = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf-8");
    expect(content).not.toContain("protectedProcedure.");
    expect(content).toContain("publicProcedure");
  });

  it("tab screens do not import useAuth", () => {
    const tabFiles = ["index.tsx", "events.tsx", "songs.tsx", "members.tsx", "more.tsx"];
    for (const file of tabFiles) {
      const content = fs.readFileSync(path.join(projectRoot, `app/(tabs)/${file}`), "utf-8");
      expect(content).not.toContain("useAuth");
    }
  });
});

describe("Voice Type for Vocalists", () => {
  it("should have VOICE_TYPES constant in members screen", () => {
    const content = fs.readFileSync(path.join(projectRoot, "app/(tabs)/members.tsx"), "utf-8");
    expect(content).toContain("VOICE_TYPES");
    expect(content).toContain("Soprano");
    expect(content).toContain("Alto");
    expect(content).toContain("Tenor");
    expect(content).toContain("Baritone");
    expect(content).toContain("Bass");
  });

  it("should only show voice type selector when Vocalist role is selected", () => {
    const content = fs.readFileSync(path.join(projectRoot, "app/(tabs)/members.tsx"), "utf-8");
    expect(content).toContain('signupRole === "Vocalist"');
    expect(content).toContain("Voice Type");
  });

  it("should have signupVoiceType state", () => {
    const content = fs.readFileSync(path.join(projectRoot, "app/(tabs)/members.tsx"), "utf-8");
    expect(content).toContain("signupVoiceType");
    expect(content).toContain("setSignupVoiceType");
  });

  it("should include voiceType in signup mutation", () => {
    const content = fs.readFileSync(path.join(projectRoot, "app/(tabs)/members.tsx"), "utf-8");
    expect(content).toContain("voiceType:");
  });

  it("should have voiceType column in schema", () => {
    const content = fs.readFileSync(path.join(projectRoot, "drizzle/schema.ts"), "utf-8");
    expect(content).toContain("voiceType");
  });

  it("should have voiceType in server signup route", () => {
    const content = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf-8");
    expect(content).toContain("voiceType: z.string().optional()");
  });

  it("should display voice type on member cards", () => {
    const content = fs.readFileSync(path.join(projectRoot, "app/(tabs)/members.tsx"), "utf-8");
    expect(content).toContain("voiceType");
    expect(content).toContain("memberVoiceType");
  });

  it("should display voice type on member detail screen", () => {
    const content = fs.readFileSync(path.join(projectRoot, "app/member/[id].tsx"), "utf-8");
    expect(content).toContain("voiceType");
    expect(content).toContain("Voice Type");
  });
});
