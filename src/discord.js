// src/discord.js
import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

let client;

export function startDiscordBot({ title, artist, link }) {
  if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_CHANNEL_ID) {
    console.warn("❗ DISCORD_TOKEN atau DISCORD_CHANNEL_ID tidak ditemukan di .env");
    return;
  }

  client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

  client.once("ready", () => {
    console.log("🤖 Discord bot siap!");

    const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
    if (!channel) {
      console.warn("❗ Channel Discord tidak ditemukan");
      return;
    }

    const message = `🎶 Lagu hari ini:
**${title}** oleh *${artist}*
🌐 ${link}`;
    channel.send(message)
      .then(() => console.log("✅ Pesan dikirim ke Discord!"))
      .catch(err => console.error("❌ Gagal kirim pesan ke Discord:", err));
  });

  client.login(process.env.DISCORD_TOKEN);
}
