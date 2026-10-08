# PROGRESSIVE WEB APP (PWA) SPECIFICATION

Aether Messenger meets full Progressive Web App installability and offline standards.

## 1. Web App Manifest Standards

The manifest file `public/manifest.webmanifest` specifies:
- `id`: `/`
- `name`: Matches dynamic `APP_NAME`
- `short_name`: Matches `APP_SHORT_NAME` (≤ 12 characters to prevent truncation)
- `display`: `standalone` (removes browser navigation chrome for native application feel)
- `theme_color`: Matches `#090d16` (Obsidian theme status bar)
- `background_color`: `#090d16`
- `icons`: Scalable SVG and high-resolution icons with `purpose: "any"` and `purpose: "maskable"`

## 2. In-App Install Prompt (`PWAInstallButton`)

- Intercepts and caches the browser `beforeinstallprompt` event.
- Displays an integrated **Install App** button in the sidebar header.
- Automatically hides when the app is already running in `standalone` mode.
- Provides a guided instructions modal for **iOS Safari** users (*Tap Share -> Add to Home Screen*).

## 3. Offline Capabilities & Reliability

- **Cached Shell**: Core interface elements load immediately from browser cache.
- **Offline Indicator Banner**: Unobtrusive warning banner alerts users if internet connection is lost.
- **Pending Message Queue**: Messages drafted offline are queued and synchronized upon reconnection.
