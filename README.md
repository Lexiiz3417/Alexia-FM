# 📻 Alexia Zaphira

> **"Your daily music discovery—breaking the cycle of songs on repeat."**

Alexia Zaphira is an automated music curator designed to refresh your daily soundtrack. She doesn't stream audio; she rescues hidden gems from your **YouTube Music** library, polishes their messy metadata, renders professional **2K visuals**, and broadcasts a fresh "Daily Vibe" across **Discord, Instagram, Facebook, Threads, Telegram, and WhatsApp.**

---

### 🔥 Core Features

* **🚀 Daily Autopost (12:00 PM):** Automatically picks a random track from your collection and shares it. Built-in **Anti-Repeat** logic ensures you don't get bored with the same songs twice.
* **🖼️ 2K Visual Renderer:** Generates high-quality "Now Playing" images on the fly. Features glassmorphism, dynamic blur, and full support for **Bilingual fonts** (JP/KR/EN) for a clean, global aesthetic.
* **📊 Monthly Recap:** Automatically archives every shared track into a beautiful monthly summary, making sure your new discoveries are never lost.
* **🧹 Metadata Refinement:** Swaps messy YouTube titles ("Official Video", "Lyric Video", etc.) for clean, studio-grade metadata and HD artwork via Deezer & iTunes APIs.
* **🌐 Multi-Platform Sync:** One broadcast to rule them all. Simultaneous posting to **Discord, Meta (FB/IG/Threads), Telegram,** and **WhatsApp Groups.**
* **💾 Database-Driven:** Powered by **Supabase (Postgres)** for persistent play history and automated reshuffling.

---

### 🛡️ Management (Admin Only)

Alexia is built to be managed easily through authorized commands:

* **!setchannel**: (WhatsApp/Discord) Registers a group or channel as the official home for daily vibes.
* **!removechannel**: (WhatsApp/Discord) Stops the automated daily broadcasts.
* **Smart Security**: Only recognized Admin IDs (LID or Phone Number) can trigger management commands.

---

### ⚙️ Configuration Essentials

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Your PostgreSQL connection string. |
| `YT_PLAYLIST_ID` | Source YouTube Music playlist ID. |
| `META_ACCESS_TOKEN`| Long-lived token for FB/IG/Threads. |
| `TELEGRAM_BOT_TOKEN`| Token for automated Telegram broadcasts. |
| `START_DATE` | Milestone date for the "Day X" counter. |

---

### 🏁 Getting Started

1.  **Install**: `npm install`
2.  **Deploy**: `node src/deploy-commands.js` (Discord Slash Commands)
3.  **Run**: `node src/index.js`
4.  **Connect**: Complete the WhatsApp Pairing via terminal.

---
*Built for the music lovers who are tired of the same old loop. Enjoy the discovery.*