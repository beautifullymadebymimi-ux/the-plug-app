import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.resolve(__dirname, "..");

describe("The Plug App - File Structure", () => {
  it("should have all tab screens", () => {
    const tabScreens = ["index.tsx", "events.tsx", "songs.tsx", "members.tsx", "more.tsx"];
    for (const screen of tabScreens) {
      const filePath = path.join(projectRoot, "app/(tabs)", screen);
      expect(fs.existsSync(filePath), `Missing tab screen: ${screen}`).toBe(true);
    }
  });

  it("should have tab layout", () => {
    const filePath = path.join(projectRoot, "app/(tabs)/_layout.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("should have login screen", () => {
    const filePath = path.join(projectRoot, "app/login.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("should have detail screens", () => {
    const detailScreens = ["event/[id].tsx", "song/[id].tsx", "setlist/[id].tsx", "member/[id].tsx", "devotional/[id].tsx"];
    for (const screen of detailScreens) {
      const filePath = path.join(projectRoot, "app", screen);
      expect(fs.existsSync(filePath), `Missing detail screen: ${screen}`).toBe(true);
    }
  });

  it("should have root layout", () => {
    const filePath = path.join(projectRoot, "app/_layout.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });
});

describe("The Plug App - Theme Configuration", () => {
  it("should have custom brand colors in theme.config.js", () => {
    const themeConfig = fs.readFileSync(path.join(projectRoot, "theme.config.js"), "utf-8");
    // Check for green primary color from The Plug brand
    expect(themeConfig).toContain("#1DB954");
    // Check for dark background
    expect(themeConfig).toContain("#0D0D0D");
  });
});

describe("The Plug App - App Configuration", () => {
  it("should have correct app name in app.config.ts", () => {
    const appConfig = fs.readFileSync(path.join(projectRoot, "app.config.ts"), "utf-8");
    expect(appConfig).toContain("The Plug");
  });

  it("should have logo URL set", () => {
    const appConfig = fs.readFileSync(path.join(projectRoot, "app.config.ts"), "utf-8");
    expect(appConfig).toContain("logoUrl");
    // Should not be empty
    expect(appConfig).not.toContain('logoUrl: ""');
  });
});

describe("The Plug App - Icon Mappings", () => {
  it("should have all required icon mappings", () => {
    const iconSymbol = fs.readFileSync(path.join(projectRoot, "components/ui/icon-symbol.tsx"), "utf-8");
    const requiredMappings = [
      "house.fill",
      "calendar",
      "music.note",
      "person.2.fill",
      "ellipsis.circle",
      "plus",
      "magnifyingglass",
      "book.fill",
      "bubble.left.fill",
      "arrow.left",
      "xmark",
    ];
    for (const mapping of requiredMappings) {
      expect(iconSymbol).toContain(`"${mapping}"`);
    }
  });
});

describe("The Plug App - Database Schema", () => {
  it("should have all required tables in schema", () => {
    const schema = fs.readFileSync(path.join(projectRoot, "drizzle/schema.ts"), "utf-8");
    const requiredTables = ["events", "songs", "setlists", "media", "devotionals", "chatMessages", "memberProfiles", "eventRsvps"];
    for (const table of requiredTables) {
      expect(schema).toContain(table);
    }
  });
});

describe("The Plug App - API Routes", () => {
  it("should have all feature routers", () => {
    const routers = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf-8");
    const requiredRouters = ["members:", "events:", "songs:", "setlists:", "media:", "devotionals:", "chat:", "home:"];
    for (const r of requiredRouters) {
      expect(routers).toContain(r);
    }
  });

  it("should use public procedures for all routes (no auth required)", () => {
    const routers = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf-8");
    expect(routers).toContain("publicProcedure");
    expect(routers).not.toContain("protectedProcedure.");
  });
});

describe("The Plug App - Tab Layout", () => {
  it("should configure 5 tabs", () => {
    const tabLayout = fs.readFileSync(path.join(projectRoot, "app/(tabs)/_layout.tsx"), "utf-8");
    const tabScreenCount = (tabLayout.match(/Tabs\.Screen/g) || []).length;
    expect(tabScreenCount).toBe(5);
  });

  it("should have correct tab names", () => {
    const tabLayout = fs.readFileSync(path.join(projectRoot, "app/(tabs)/_layout.tsx"), "utf-8");
    expect(tabLayout).toContain('"Home"');
    expect(tabLayout).toContain('"Events"');
    expect(tabLayout).toContain('"Songs"');
    expect(tabLayout).toContain('"Members"');
    expect(tabLayout).toContain('"More"');
  });
});

describe("The Plug App - No Auth Required", () => {
  it("should NOT redirect to login on home screen", () => {
    const homeScreen = fs.readFileSync(path.join(projectRoot, "app/(tabs)/index.tsx"), "utf-8");
    expect(homeScreen).not.toContain("useAuth");
    expect(homeScreen).not.toContain('"/login"');
  });

  it("should not have logout in more screen", () => {
    const moreScreen = fs.readFileSync(path.join(projectRoot, "app/(tabs)/more.tsx"), "utf-8");
    expect(moreScreen).not.toContain("Sign Out");
  });
});

describe("The Plug App - Assets", () => {
  it("should have app icon", () => {
    expect(fs.existsSync(path.join(projectRoot, "assets/images/icon.png"))).toBe(true);
  });

  it("should have splash icon", () => {
    expect(fs.existsSync(path.join(projectRoot, "assets/images/splash-icon.png"))).toBe(true);
  });

  it("should have favicon", () => {
    expect(fs.existsSync(path.join(projectRoot, "assets/images/favicon.png"))).toBe(true);
  });
});
