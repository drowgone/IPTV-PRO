<div align="center">

<img src="https://img.shields.io/badge/IPTV-PRO%20PLAYER-6366f1?style=for-the-badge&logo=youtube&logoColor=white" alt="IPTV Pro Player" />

# 📺 Premium IPTV Player

**A blazing-fast, feature-rich IPTV player built with Vanilla JS — no frameworks, no bloat.**  
Stream thousands of live TV channels with advanced filtering, live recording, and a stunning premium UI.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![HLS](https://img.shields.io/badge/HLS-Supported-brightgreen?style=flat-square&logo=html5)](https://github.com/video-dev/hls.js)
[![DASH](https://img.shields.io/badge/MPEG--DASH-Supported-blue?style=flat-square)](https://github.com/Dash-Industry-Forum/dash.js)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple?style=flat-square&logo=googlechrome)](https://web.dev/progressive-web-apps/)
[![Vanilla JS](https://img.shields.io/badge/Built%20With-Vanilla%20JS-f7df1e?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)

</div>

---

## ✨ Features

### 🎬 Playback
- **HLS (M3U8)** streaming via [HLS.js](https://github.com/video-dev/hls.js) with auto-recovery on errors
- **MPEG-DASH (.mpd)** streaming via [Dash.js](https://github.com/Dash-Industry-Forum/dash.js)
- **Native video** support (MP4, MKV, WebM, Safari HLS)
- **Low-latency mode** enabled by default for live streams
- **Picture-in-Picture (PIP)** support
- Fullscreen toggle with keyboard shortcut (`F`)

### 🔍 Advanced Filtering & Search
- Smart **multi-criteria search** — searches by channel name, country, language, and genre simultaneously
- Filter by **Country** 🌎, **Language** 🗣, and **Category/Genre** — dynamically populated from your M3U playlist
- Supports **multi-value** M3U attributes (`tvg-country`, `tvg-language`) with semicolon-separated values per [iptv-org](https://github.com/iptv-org/iptv) standard
- **One-click filter reset** button
- Channel tabs: **All**, **Favorites** ⭐, **History** 🕐

### 📡 Channel Cards
- **Auto-generated logos** from channel initials with unique gradient colors when no logo is available
- Displays **country & language tags** on each card
- **Genre badges** with color-coded tags (News, Sports, Kids, Entertainment, etc.)
- Inline meta tags cleaned of noise characters (`()`, `[]`, etc.)

### 🎙️ Live Recording
- Record any live stream directly in the browser — **no server required**
- **8 Mbps high-quality** recording (VP9 / H.264 depending on browser support)
- Output saved as **`.mp4`** with smart filenames: `ChannelName_YYYY-MM-DD_HH-MM.mp4`
- **Pause & Resume** recording mid-stream — with animated Pause/Play toggle button
- Live **REC timer overlay** on the video with blinking red dot animation
- Timer shows `⏸` symbol when paused
- CORS/DRM-protected streams gracefully handled with a user-friendly alert

### ⚠️ Smart Error Handling
- **TV Static (No Signal) animation** when a stream fails — just like a real TV!
- **Glitch effect** on the broken TV icon
- Localized Uzbek error messages for each specific error type:
  | Error | Message |
  |-------|---------|
  | Server offline / 404 | 📡 Signal Topilmadi |
  | CORS / Geoblock | 🔒 Kirish Taqiqlangan |
  | DRM protection | 🛡 DRM Himoyasi |
  | Unsupported format | 🎞 Format Xatosi |
  | No internet | 🌐 Ulanish Xatosi |
- **Retry** button to reload the stream

### 🎨 Premium UI / UX
- **Glassmorphism** design with animated gradient glows
- 3 built-in themes: **Dark** 🌑 | **Light** ☀️ | **Glass** 🔮
- All themes fully support icon and text visibility (no hardcoded colors)
- Responsive for **mobile, tablet, and desktop**
- **Resizable sidebar** via drag handle
- Smooth **micro-animations** throughout (hover, active, pop-in, glitch, pulsing)
- **Fluid typography** using CSS `clamp()` for all screen sizes

### ⚡ Performance
- **Virtual scrolling** for channel lists — handles 10,000+ channels without lag
- Lightweight: zero build steps, zero npm dependencies at runtime
- **Service Worker** (PWA) for offline caching
- **Local storage** persistence for M3U URL, theme, favorites, and last-watched channel

---

## 🚀 Quick Start

### Option 1: Open Directly
This is a 100% client-side app. Just open `index.html` in your browser — no server needed.

```bash
git clone https://github.com/drowgone/IPTV-PRO.git
cd IPTV-PRO
# Open index.html in Chrome/Firefox/Edge
```

### Option 2: Local Dev Server (recommended)
```bash
# Using Python
python3 -m http.server 8080

# Using Node.js npx
npx serve .
```
Then visit `http://localhost:8080`

### Loading a Playlist
1. Click the **⚙️ Settings** button (top-right of sidebar)
2. Paste your M3U playlist URL
3. Click **Save**

**Test playlist:**
```
https://iptv-org.github.io/iptv/index.m3u
```

---

## 📁 Project Structure

```
iptv-pro-player/
├── index.html          # Main HTML shell
├── style.css           # Full design system (themes, animations, components)
├── app.js              # Core app logic, filtering, rendering, virtual scroll
├── controls.js         # Video player controls, recording, PIP, fullscreen
├── stream.js           # HLS/DASH/Native stream handler with error categorization
├── parser.js           # M3U playlist parser (multi-value country/language support)
├── storage.js          # LocalStorage persistence layer
├── sw.js               # Service Worker for PWA caching
├── manifest.json       # PWA manifest
└── README.md
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `F` | Toggle Fullscreen |
| `M` | Toggle Mute |
| `↑` / `↓` | Volume Up / Down |

---

## 📖 M3U / Playlist Support

This player follows the [iptv-org](https://github.com/iptv-org/iptv) M3U extended format:

```m3u
#EXTM3U
#EXTINF:-1 tvg-id="AlJazeera.qa" tvg-name="Al Jazeera English" tvg-logo="https://..." tvg-country="QA;US;GB" tvg-language="English" group-title="News",Al Jazeera English
https://live-hls-web-aje.getaj.net/AJE/index.m3u8
```

- `tvg-country` and `tvg-language` support **multiple values** (semicolon-separated) for proper multi-language/multi-country channels
- `group-title` is used for genre/category filtering

---

## 🛠️ Browser Compatibility

| Browser | HLS | DASH | Recording | PIP |
|---------|-----|------|-----------|-----|
| Chrome 90+ | ✅ | ✅ | ✅ | ✅ |
| Firefox 90+ | ✅ | ✅ | ✅ | ✅ |
| Edge 90+ | ✅ | ✅ | ✅ | ✅ |
| Safari 14+ | ✅ (native) | ⚠️ | ⚠️ | ✅ |

> **Note:** Some streams may be blocked by CORS or DRM policies. This is a browser security limitation, not a player bug.

---

## 🔐 Limitations

- **CORS-protected streams** cannot be played in the browser directly (requires a proxy or the stream server must allow cross-origin)
- **DRM-protected content** (Widevine, FairPlay) requires a licensed player environment
- **Recording** only works for streams that the browser can access — CORS-blocked streams cannot be captured

---

## 📸 Screenshots

> *(Add your screenshots here)*
> - `![Dark Theme](screenshots/dark.png)`
> - `![Light Theme](screenshots/light.png)`
> - `![Recording](screenshots/recording.png)`

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ · Powered by [HLS.js](https://github.com/video-dev/hls.js) & [Dash.js](https://github.com/Dash-Industry-Forum/dash.js)

⭐ **Star this repo if you find it useful!**

</div>
