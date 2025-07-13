// src/discord.js
import { Client, GatewayIntentBits, EmbedBuilder, ActivityType } from "discord.js";
import dotenv from "dotenv";
import { getRandomTrack } from "./spotify.js";
import { getUniversalLink } from "./songlink.js";
import { generateCaption } from "./caption.js";
import Database from "@replit/database";

dotenv.config();

// Inisialisasi "Buku Catatan" (Database)
const db = new Database();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

/**
 * Fungsi untuk mengubah status bot menjadi multi-baris.
 * @param {object} track - Objek track dari Spotify.
 */
export function updateBotPresence(track) {
  if (!client.user) return;
  client.user.setActivity(track.name, {
    type: ActivityType.Listening,
    state: `by ${track.artist}`,
  });
  console.log(`✅ Status bot di-update: Listening to ${track.name} by ${track.artist}`);
}

/**
 * Event yang berjalan sekali saat bot berhasil online.
 */
client.once("ready", () => {
  console.log(`🎧 DJ ${client.user.tag} siap melayani semua server!`);
  global.discordClient = client;
  // Set status awal saat bot baru nyala
  client.user.setActivity('musik untuk dunia', { type: ActivityType.Listening });
});

/**
 * Event yang berjalan setiap kali ada interaksi (seperti slash command).
 */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  // --- Handler untuk command /music ---
  if (commandName === 'music') {
    try {
      await interaction.deferReply(); 
      const track = await getRandomTrack();
      updateBotPresence(track);
      const universalLink = await getUniversalLink(track.url);
      const tempCaption = await generateCaption({ day: '✨', title: track.name, artist: track.artist, genre: track.genre, link: universalLink });
      const finalCaption = tempCaption.replace(/Day ✨ – /g, '');
      const embed = new EmbedBuilder().setColor('#1DB954').setDescription(finalCaption).setImage(track.image).setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error di command /music:", error);
      await interaction.editReply({ content: 'Waduh, ada error. Coba lagi nanti ya!' });
    }
  }

  // --- Handler untuk command /setchannel ---
  if (commandName === 'setchannel') {
    if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({ content: 'Waduh, cuma admin server yang bisa pake command ini!', ephemeral: true });
    }
    const serverId = interaction.guildId;
    const channelId = interaction.channelId;
    await db.set(serverId, channelId);
    await interaction.reply({ 
      content: `Oke, siap! Channel ini sekarang akan menerima postingan musik harian. Pastikan aku punya izin "Send Messages" dan "Embed Links" di sini ya!`,
      ephemeral: true
    });
    console.log(`✅ Channel diatur untuk server ${serverId}: ${channelId}`);
  }

  // --- Handler untuk command /removechannel ---
  if (commandName === 'removechannel') {
    if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({ content: 'Waduh, cuma admin server yang bisa pake command ini!', ephemeral: true });
    }
    const serverId = interaction.guildId;
    await db.delete(serverId);
    await interaction.reply({
      content: 'Siap, laksanakan! Server ini tidak akan lagi menerima postingan musik harian.',
      ephemeral: true
    });
    console.log(`🗑️ Channel dihapus untuk server ${serverId}`);
  }
});

/**
 * Fungsi untuk menginisialisasi dan login bot Discord.
 */
export function startDiscordBot() {
  if (!process.env.DISCORD_TOKEN) {
    console.warn("❗ DISCORD_TOKEN tidak ditemukan, bot tidak dijalankan.");
    return;
  }
  client.login(process.env.DISCORD_TOKEN);
}

/**
 * Fungsi untuk mengirim embed postingan otomatis harian ke channel tertentu.
 */
export async function sendAutoPostEmbed({ caption, imageUrl, channelId }) {
  if (!global.discordClient) return;
  const channel = global.discordClient.channels.cache.get(channelId);

  if (!channel) {
      console.warn(`❗ Channel dengan ID ${channelId} tidak ditemukan.`);
      // Hapus data yang salah dari database biar nggak menuh-menuhin
      const serverId = Object.keys(await db.getAll()).find(key => db.get(key) === channelId);
      if(serverId) await db.delete(serverId);
      return;
  }

  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setDescription(caption)
    .setImage(imageUrl)
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}