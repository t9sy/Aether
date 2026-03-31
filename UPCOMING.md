<p align="center">
  <img src="src/renderer/logo-comp-transparent.png" alt="Aether Browser" width="80" />
</p>

<h1 align="center">Upcoming Features</h1>

<p align="center">
  A look at what's next for Aether Browser.<br/>
  Features are listed roughly in priority order. Nothing here is guaranteed — this is a living document.
</p>

---

## 🔥 High Priority

### Extensions API (v2.0)
> Bring-your-own extensions with a lightweight plugin system.

- [ ] Define a manifest format for Aether extensions
- [ ] Sandboxed extension runtime with limited API access
- [ ] Extension management page in Settings
- [ ] Support for content scripts injected into web pages

### Ad Blocker
> Built-in, zero-config content blocker.

- [ ] Integrate a filter-list engine (EasyList, EasyPrivacy)
- [ ] Per-site toggle to allow/block ads
- [ ] Counter badge showing blocked requests per tab

### Sync & Profiles
> Use Aether across machines.

- [ ] Local profile system (multiple users on one machine)
- [ ] Import/export bookmarks, passwords, and settings as encrypted JSON
- [ ] Optional cloud sync (self-hosted or provider-agnostic)

---

## 🚀 Medium Priority

### Find in Page
> `Ctrl+F` to search within the active tab.

- [ ] Search overlay with match count and highlight
- [ ] Navigate between matches with Enter / Shift+Enter
- [ ] Case-sensitive and regex toggle

### Tab Groups
> Organize tabs into collapsible, color-coded groups.

- [ ] Create, rename, and color-code tab groups
- [ ] Collapse/expand groups to save space
- [ ] Drag tabs between groups

### Picture-in-Picture
> Pop out videos into a floating mini player.

- [ ] Detect playing video elements on the page
- [ ] Floating PiP window with play/pause and close
- [ ] Always-on-top mode

### Reader Mode
> Strip away clutter and read articles distraction-free.

- [ ] One-click reader mode toggle in the URL bar
- [ ] Adjustable font size, line height, and theme
- [ ] Estimated reading time

### Split View
> View two tabs side by side.

- [ ] Drag a tab to the edge of the window to split
- [ ] Adjustable split ratio with a draggable divider
- [ ] Independent scroll and navigation per pane

---

## 💡 Nice to Have

### Custom New Tab Backgrounds
- [ ] Upload a custom wallpaper for the new tab page
- [ ] Rotating daily wallpapers from Unsplash
- [ ] Ambient blur and overlay controls

### Command Palette
> `Ctrl+K` to search tabs, bookmarks, history, and actions.

- [ ] Fuzzy search across all browser data
- [ ] Quick actions (close tab, toggle theme, open settings)
- [ ] Recent and pinned commands

### Reading List
- [ ] Save articles to read later (separate from bookmarks)
- [ ] Mark as read/unread
- [ ] Offline caching for saved articles

### Multi-Search Engine Support
- [ ] Choose default search engine (Google, DuckDuckGo, Bing, etc.)
- [ ] Custom search engine URLs
- [ ] Quick-switch via omnibox prefix (e.g., `!ddg query`)

### Vertical Tabs
- [ ] Optional vertical tab bar on the left side
- [ ] Collapsible to icons-only mode
- [ ] Drag-to-reorder and grouping support

### Session Management
- [ ] Save and restore tab sessions by name
- [ ] Auto-save session on close
- [ ] Session history with timestamps

---

## ✅ Recently Shipped

These features are already live in the current release:

- [x] **Tabbed Browsing** — Full tab management with shortcuts
- [x] **Smart Omnibox** — URL detection + Google Search fallback
- [x] **Glassmorphism Sidebar** — Bookmarks, History, Quick Note, Essentials
- [x] **Downloads Manager** — Real-time progress with pause/resume/cancel
- [x] **Password Manager** — Add, edit, delete saved credentials
- [x] **3 Dynamic Themes** — Aether Light, Deep Night, Cyberpunk Purple
- [x] **Context Menus** — Full right-click support with link/image/text actions
- [x] **Customizable New Tab** — Editable shortcut grid with search
- [x] **Developer Mode** — Hidden dev options with DevTools controls
- [x] **Keyboard Shortcuts** — 30+ intercepted shortcuts that work inside webviews
- [x] **Permission Handling** — Controlled prompts for media, geo, notifications

---

<p align="center">
  <sub>Have a feature request? Open an issue on GitHub — we'd love to hear from you.</sub>
</p>
