# The Plug — Mobile App Design

## Brand Identity

**Colors:**
- **Primary Green:** #1DB954 (vibrant, energetic — the green from the logo)
- **Background Dark:** #0D0D0D (near-black, sleek)
- **Surface Dark:** #1A1A1A (cards, elevated surfaces)
- **Foreground:** #FFFFFF (primary text on dark)
- **Muted:** #9CA3AF (secondary text)
- **Border:** #2A2A2A (subtle dividers)
- **Accent Green Light:** #4ADE80 (success states, highlights)
- **Error:** #EF4444
- **Warning:** #F59E0B

**Design Philosophy:** Dark-first, modern, minimal. Inspired by Spotify/Instagram aesthetics to appeal to younger users. Bold typography, generous spacing, rounded corners, smooth transitions.

---

## Screen List & Layout

### 1. Login / Welcome Screen
- Full-screen dark background with The Plug logo centered
- "Welcome to The Plug" headline
- "Sign In" button (primary green, rounded pill shape)
- Subtle tagline: "Stay connected. Stay plugged in."

### 2. Home Screen (Tab: Home)
- Greeting: "Hey, [Name]" with time-based greeting
- **Upcoming Events** horizontal card carousel (next 3 events)
- **Daily Devotional** card with today's scripture/thought
- **Recent Media** horizontal scroll of latest photos/videos
- **Quick Actions** row: New Event, Add Song, Share Media

### 3. Events Screen (Tab: Events)
- Calendar month view at top (compact)
- List of upcoming events below, sorted by date
- Each event card: title, date/time, location, type badge (Rehearsal, Service, Special)
- FAB (+) button to create new event (admin/leader only)

### 4. Event Detail Screen
- Hero section with event type color accent
- Title, date, time, location
- Description text
- RSVP button (Going / Maybe / Can't Make It)
- Attendee avatars row
- Share button

### 5. Songs / Setlists Screen (Tab: Songs)
- Segmented control: "Songs" | "Setlists"
- **Songs tab:** Searchable list of all songs with artist, key, tempo
- **Setlists tab:** List of setlists by date/event
- Each song card: title, artist, key badge, tempo
- FAB (+) to add song or create setlist

### 6. Song Detail Screen
- Song title, artist, key, tempo, BPM
- Lyrics section (scrollable)
- Notes section (arrangement notes, who plays what)
- Link to YouTube/Spotify if available
- Edit button (admin)

### 7. Setlist Detail Screen
- Event name and date at top
- Ordered list of songs (drag to reorder for admin)
- Each song shows key and any notes
- Share setlist button

### 8. Members Screen (Tab: Members)
- Grid/list of group members with avatar, name, role/instrument
- Search bar at top
- Tap member → Member Profile

### 9. Member Profile Screen
- Avatar (large), name, role (Vocalist, Drummer, Keys, etc.)
- Contact info (email, phone — if shared)
- Instrument/role badges
- "Message" button (opens chat)

### 10. Media Screen (Tab: Media)
- Grid layout of photos and videos (Instagram-style)
- Filter tabs: All | Photos | Videos
- Tap to view full-screen
- FAB (+) to upload new media

### 11. Media Viewer Screen
- Full-screen image/video viewer
- Swipe between media items
- Caption, date, uploader name
- Share button, download button

### 12. Devotionals Screen (accessible from Home card or drawer)
- List of devotionals by date (most recent first)
- Each card: date, title, scripture reference, preview text
- Tap to read full devotional

### 13. Devotional Detail Screen
- Date and title
- Scripture passage (highlighted)
- Reflection/thought text
- Prayer prompt
- Share button

### 14. Group Chat Screen (accessible from tab or home)
- Real-time messaging interface
- Messages with sender avatar, name, timestamp
- Text input with send button
- Support for text messages
- Scroll to load older messages

### 15. Profile / Settings Screen
- User avatar and name
- Edit profile option
- Notification preferences
- Dark/Light mode toggle (default dark)
- About The Plug section
- Logout button

---

## Tab Bar Configuration

| Tab | Icon | Label |
|-----|------|-------|
| Home | house.fill | Home |
| Events | calendar | Events |
| Songs | music.note.list | Songs |
| Members | person.2.fill | Members |
| More | ellipsis.circle | More |

The "More" tab provides access to: Media, Devotionals, Chat, Profile/Settings.

---

## Key User Flows

### Flow 1: Login
1. App opens → Welcome screen
2. User taps "Sign In" → OAuth login flow
3. Successful auth → Redirect to Home tab

### Flow 2: View Upcoming Event
1. Home screen → Tap event card in carousel
2. Event Detail screen → View details
3. Tap "Going" to RSVP
4. Back to Home

### Flow 3: Browse Songs & Setlist
1. Songs tab → Browse/search songs
2. Tap song → Song Detail with lyrics
3. Switch to Setlists segment → View setlist for upcoming event
4. Tap setlist → See ordered song list

### Flow 4: Share Media
1. Media screen → Tap (+) FAB
2. Pick photo/video from device
3. Add caption → Upload
4. Media appears in grid

### Flow 5: Read Daily Devotional
1. Home screen → Tap devotional card
2. Devotional Detail → Read scripture and reflection
3. Share with group if desired

### Flow 6: Group Chat
1. More tab → Chat
2. View messages → Type and send message
3. See real-time updates from other members

---

## Navigation Architecture

```
Root Stack
├── Welcome/Login Screen (shown when not authenticated)
├── (tabs) — Main Tab Navigator
│   ├── Home
│   ├── Events
│   │   └── Event Detail (stack push)
│   ├── Songs
│   │   ├── Song Detail (stack push)
│   │   └── Setlist Detail (stack push)
│   ├── Members
│   │   └── Member Profile (stack push)
│   └── More
│       ├── Media
│       │   └── Media Viewer (stack push)
│       ├── Devotionals
│       │   └── Devotional Detail (stack push)
│       ├── Chat
│       └── Profile/Settings
└── OAuth Callback
```

---

## Data Architecture

### Local Storage (AsyncStorage)
- User preferences (theme, notifications)
- Cached data for offline access
- Draft messages

### Database Tables (Server)
- **users** (existing) — extended with avatar, instrument, phone
- **events** — id, title, description, date, time, location, type, createdBy
- **event_rsvps** — id, eventId, userId, status
- **songs** — id, title, artist, key, tempo, lyrics, notes, youtubeUrl, spotifyUrl, createdBy
- **setlists** — id, title, eventId, createdBy, date
- **setlist_songs** — id, setlistId, songId, order, notes
- **media** — id, url, type (photo/video), caption, uploadedBy, createdAt
- **devotionals** — id, title, scripture, content, date, createdBy
- **chat_messages** — id, userId, content, createdAt
- **member_profiles** — userId, instrument, phone, bio, avatarUrl
