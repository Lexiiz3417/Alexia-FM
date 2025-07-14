// src/discord.js
import { Client, GatewayIntentBits, EmbedBuilder, ActivityType } from "discord.js";
import dotenv from "dotenv";
import Keyv from "keyv"; // <-- BAHAN UTAMA DIGANTI
import { getRandomTrack } from "./spotify.js";
import { getUniversalLink } from "./songlink.js";
import { generateCaption } from "./caption.js";

dotenv.config();

// Inisialisasi "Buku Catatan Universal"
const db = new Keyv('sqlite://db.sqlite');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

export function updateBotPresence(track) {
  if (!client.user) return;
  client.user.setActivity(track.name, {
    type: ActivityType.Listening,
    state: `by ${track.artist}`,
  });
  console.log(`✅ Status bot di-update: Listening to ${track.name} by ${track.artist}`);
}

client.once("ready", () => {
  console.log(`🎧 DJ ${client.user.tag} siap melayani semua server!`);
  global.discordClient = client;
  // Status awal dari revisimu, keren!
  client.user.setActivity('My favorite music', { type: ActivityType.Listening });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  const { commandName } = interaction;

  if (commandName === 'music') {
    try {
      await interaction.deferReply(); 
      const track = await getRandomTrack();
      updateBotPresence(track);
      const universalLink = await getUniversalLink(track.url);
      const tempCaption = await generateCaption({ day: '✨', title: track.name, artist: track.artist, genre: track.genre, link: universalLink });
      const finalCaption = tempCaption.replace(/Day ✨ – /g, '');
      const embed = new EmbedBuilder().setColor('Random').setDescription(finalCaption).setImage(track.image).setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error di command /music:", error);
      await interaction.editReply({ content: 'Waduh, ada error. Coba lagi nanti ya!' });
    }
  }

  // Handler /setchannel dengan logikamu yang udah di-improve
  if (commandName === 'setchannel') {
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({ content: 'Waduh, cuma admin server yang bisa pake command ini!', ephemeral: true });
    }
    const targetChannel = interaction.options.getChannel('channel');
    const serverId = interaction.guildId;
    const channelId = targetChannel.id;

    // Logika pengecekan dari revisimu, ini bagus banget!
    const existingChannelId = await db.get(serverId);
    if (existingChannelId === channelId) { // Kita cek apakah ID nya sama persis
      await interaction.reply({
        content: `Eh, channel #${targetChannel.name} udah jadi channel broadcast di sini kok. Nggak perlu di-set ulang. 😉`,
        ephemeral: true
      });
      console.log(`❗ Channel ${targetChannel.name} (${channelId}) sudah ada di database untuk server ${serverId}.`);
    } else { 
      await db.set(serverId, channelId);
      await interaction.reply({ 
        content: `Oke, beres! Channel #${targetChannel.name} sekarang akan jadi tempat nongkrongnya Alexia FM setiap hari.`,
        ephemeral: true
      });
      console.log(`✅ Channel diatur untuk server ${serverId}: ${channelId} (${targetChannel.name})`);
    }
  }

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

  if (commandName === 'subscribers') {
    try {
      await interaction.deferReply(); 
      
      // CARA BARU BUAT NGITUNG PAKE Keyv
      let totalSubscribers = 0;
      for await(const [key, value] of db.iterator()) {
        totalSubscribers++;
      }

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📻 Alexia FM Stats')
        .setDescription(`Saat ini, Alexia FM sudah mengudara di **${totalSubscribers}** server! 🚀`)
        .setFooter({ text: 'Terima kasih sudah jadi bagian dari komunitas!' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Error di command /subscribers:", error);
      await interaction.editReply({ content: 'Waduh, gagal ngambil data statistik.' });
    }
  }
});

export function startDiscordBot() {
  if (!process.env.DISCORD_TOKEN) {
    console.warn("❗ DISCORD_TOKEN tidak ditemukan, bot tidak dijalankan.");
    return;
  }
  client.login(process.env.DISCORD_TOKEN);
}

export async function sendAutoPostEmbed({ caption, imageUrl, channelId }) {
  if (!global.discordClient) return;
  const channel = global.discordClient.channels.cache.get(channelId);

  if (!channel) {
    console.warn(`❗ Channel dengan ID ${channelId} tidak ditemukan.`);
    // CARA BARU BUAT HAPUS DATA YANG SALAH PAKE Keyv
    let serverId;
    for await(const [key, value] of db.iterator()) {
        if (value === channelId) {
            serverId = key;
            break;
        }
    }
    if (serverId) await db.delete(serverId);
    return;
  }

  const embed = new EmbedBuilder().setColor('Random').setDescription(caption).setImage(imageUrl).setTimestamp();
  await channel.send({ embeds: [embed] });
}
