import * as Linking from "expo-linking";
import * as ReactNative from "react-native";
import * as WebBrowser from "expo-web-browser";

// Extract scheme from bundle ID (last segment timestamp, prefixed with "manus")
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const bundleId = "space.manus.the.plug.app.t20260416143548";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  portal: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  deepLinkScheme: schemeFromBundleId,
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;

/**
 * Get the API base URL, deriving from current hostname if not set.
 * Metro runs on 8081, API server runs on 3000.
 * URL pattern: https://PORT-sandboxid.region.domain
 *
 * On the deployed site (e.g. theplugapp-xxx.manus.space), the API is served
 * from the same origin under /api, so we return "" to use relative URLs.
 */
export function getApiBaseUrl(): string {
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;

    // Deployed site: *.manus.space — API is same-origin, use relative URLs
    if (hostname.endsWith(".manus.space")) {
      return "";
    }

    // Dev sandbox: 8081-sandboxid.region.domain -> 3000-sandboxid.region.domain
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
  }

  // If API_BASE_URL is set (native), use it
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  // Fallback to empty (will use relative URL)
  return "";
}

/**
 * Get the deployed server base URL for OAuth callbacks.
 * This is the HTTPS URL that the OAuth provider will redirect to.
 * On deployed site: same origin. On dev: the API server URL.
 */
function getServerCallbackBaseUrl(): string {
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;

    // Deployed site: *.manus.space — use same origin
    if (hostname.endsWith(".manus.space")) {
      return `${protocol}//${hostname}`;
    }

    // Dev sandbox: use the 3000 port server
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
  }

  // Native: use the API base URL (which is the HTTPS server URL)
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

const encodeState = (value: string) => {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(value);
  }
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) {
    return BufferImpl.from(value, "utf-8").toString("base64");
  }
  return value;
};

/**
 * Get the redirect URI for OAuth callback.
 * - Web: uses API server callback endpoint (HTTPS)
 * - Native: also uses API server callback endpoint (HTTPS) because
 *   Expo Go doesn't support custom schemes and the OAuth server
 *   only allows http, https, or manus* schemes.
 *   The server's /api/oauth/mobile endpoint handles the exchange
 *   and returns JSON with the session token.
 */
export const getRedirectUri = () => {
  const serverBase = getServerCallbackBaseUrl();

  if (ReactNative.Platform.OS === "web") {
    // Web: use the /api/oauth/callback which sets a cookie and redirects
    return `${serverBase}/api/oauth/callback`;
  } else {
    // Native: use the /api/oauth/mobile endpoint which returns JSON
    // The OAuth server accepts https:// redirect URIs
    return `${serverBase}/api/oauth/mobile`;
  }
};

export const getLoginUrl = () => {
  const redirectUri = getRedirectUri();
  const state = encodeState(redirectUri);

  const url = new URL(`${OAUTH_PORTAL_URL}/app-auth`);
  url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

/**
 * Start OAuth login flow.
 *
 * On native platforms (iOS/Android), open an in-app browser (WebBrowser)
 * that goes to the OAuth login page. After authentication, the OAuth server
 * redirects to our /api/oauth/mobile endpoint which returns JSON with
 * the session token. We use WebBrowser.openAuthSessionAsync to capture
 * the redirect URL and extract the token.
 *
 * On web, this navigates to the login URL in the top-level window.
 *
 * @returns The redirect URL containing the auth code (native) or null (web).
 */
export async function startOAuthLogin(): Promise<string | null> {
  let loginUrl: string;
  try {
    loginUrl = getLoginUrl();
    console.log("[OAuth] Login URL:", loginUrl);
  } catch (error) {
    console.error("[OAuth] Failed to build login URL:", error);
    if (ReactNative.Platform.OS === "web" && typeof window !== "undefined") {
      window.alert("Unable to start login. Please try again later.");
    }
    return null;
  }

  if (ReactNative.Platform.OS === "web") {
    if (typeof window !== "undefined") {
      // Try window.open first (works inside iframes where location.href is blocked)
      const popup = window.open(loginUrl, "_top");
      // If window.open failed (popup blocker), try top-level navigation
      if (!popup) {
        try {
          window.top!.location.href = loginUrl;
        } catch {
          // Cross-origin iframe — fall back to current frame
          window.location.href = loginUrl;
        }
      }
    }
    return null;
  }

  // Native: use WebBrowser.openAuthSessionAsync for a proper auth flow
  // This opens an in-app browser that can capture the redirect
  try {
    const redirectUri = getRedirectUri();
    console.log("[OAuth] Opening auth session with redirect:", redirectUri);

    const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUri);
    console.log("[OAuth] Auth session result:", result);

    if (result.type === "success" && result.url) {
      // The URL will contain the code and state params from the OAuth callback
      return result.url;
    } else if (result.type === "cancel" || result.type === "dismiss") {
      console.log("[OAuth] User cancelled login");
      return null;
    }
  } catch (error) {
    console.error("[OAuth] WebBrowser auth session failed:", error);
    // Fallback: try opening in system browser
    try {
      const supported = await Linking.canOpenURL(loginUrl);
      if (supported) {
        await Linking.openURL(loginUrl);
      }
    } catch (fallbackError) {
      console.error("[OAuth] Fallback Linking.openURL also failed:", fallbackError);
    }
  }

  return null;
}
