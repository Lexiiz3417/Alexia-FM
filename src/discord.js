// src/discord.js
import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

let client;

// Diubah biar nerima 'message' langsung
export function startDiscordBot({ message }) {
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
      client.destroy(); // Matikan bot jika channel tidak ada
      return;
    }

    // Langsung kirim 'message' yang udah jadi, nggak perlu bikin baru
    channel.send(message)
      .then(() => {
        console.log("✅ Pesan dikirim ke Discord!");
        client.destroy(); // Matikan bot setelah selesai kirim pesan
      })
      .catch(err => {
        console.error("❌ Gagal kirim pesan ke Discord:", err)
        client.destroy(); // Matikan bot jika gagal kirim pesan
      });
  });

  client.login(process.env.DISCORD_TOKEN);
}