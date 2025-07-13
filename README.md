# 📻 Alexia FM

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js)
![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Spotify](https://img.shields.io/badge/Spotify_API-111B24?style=for-the-badge&logo=spotify&logoColor=1DB954)

**Breaking the cycle of songs on repeat. Your personal, automated music curator for Discord and beyond.**

Alexia FM is a sophisticated bot designed to breathe new life into your community's music discovery experience. It automatically shares a random track from a designated Spotify playlist every day and offers interactive commands to get song recommendations on demand.

---

### ✨ Features

* **🤖 Daily Autoposting:** Automatically posts a new, random song every day at a scheduled time to keep your community engaged.
* **🌐 Multi-Platform:** Seamlessly posts to your designated channels on both **Discord** and your **Facebook Page**.
* **🎵 Interactive Commands:** Users can get instant song recommendations anytime using the `/music` slash command.
* **🚀 Multi-Server Support:** Ready for public use! Server admins can use `/setchannel` to designate a channel for daily posts and `/removechannel` to opt-out.
* **🔗 Universal Links:** All Spotify links are converted to universal **Song.link** URLs, allowing anyone to listen on their preferred platform.
* **💅 Aesthetic Captions:** Posts come with beautifully formatted, genre-aware captions generated from a customizable template.
* **🎧 Dynamic Presence:** The bot shows what song it's "Listening to" with a dynamic status that updates with every new track shared.
* **☁️ 24/7 Hosting:** Built to run continuously on a platform like Replit, thanks to an integrated web server to keep it alive.

---

### 🚀 Getting Started

Follow these steps to get your own instance of Alexia FM up and running.

#### **Prerequisites**
* A **Discord Bot Token** and **Application ID** from the Discord Developer Portal.
* **Spotify API Credentials** (Client ID & Secret) from the Spotify Developer Dashboard.
* A server environment that supports Node.js (like **Replit**).

#### **Installation**
1.  **Clone or Fork this Repository.**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Configure your environment variables.** Create a `.env` file for local testing or use the "Secrets" feature on your hosting platform (e.g., Replit). See the configuration section below.
4.  **Register Slash Commands:** Run the deployment script **once** to register the commands with Discord.
    ```bash
    node src/deploy-commands.js
    ```
5.  **Run the bot!**
    ```bash
    node src/index.js
    ```

---

### ⚙️ Configuration

These environment variables are required for the bot to function.

| Variable | Description | Example |
| :--- | :--- | :--- |
| `SPOTIFY_CLIENT_ID` | Your Spotify application's Client ID. | `a1b2c3d4e5f6...` |
| `SPOTIFY_CLIENT_SECRET` | Your Spotify application's Client Secret. | `f1e2d3c4b5a6...` |
| `SPOTIFY_PLAYLIST_ID` | The ID of the Spotify playlist to pull songs from. | `37i9dQZEVXbMDoHDwVN2tF` |
| `DISCORD_TOKEN` | Your Discord bot's token. **(Keep this secret!)** | `MTA4...` |
| `DISCORD_CLIENT_ID` | Your Discord application's ID (Application ID). | `108123456789...` |
| `DISCORD_CHANNEL_ID` | (Optional) A default channel ID for your main server. | `109876543210...` |
| `FACEBOOK_PAGE_ID` | (Optional) The ID of your Facebook Page. | `1000123456789...` |
| `FACEBOOK_ACCESS_TOKEN`| (Optional) A non-expiring Page Access Token. | `EAA...` |
| `START_DATE` | The date when the "Day X" counter should begin. | `2025-07-08` |

---

### 🤖 Usage

Alexia FM is controlled via simple slash commands:

* `/music`: Get a random song recommendation instantly.
* `/setchannel`: (Admin Only) Sets the current channel to receive daily automated song posts.
* `/removechannel`: (Admin Only) Stops the daily automated posts for this server.

---
*This project was built with passion to make music discovery fun and automated. Enjoy!*