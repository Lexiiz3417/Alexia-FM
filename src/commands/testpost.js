// src/commands/testpost.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Keyv from 'keyv'; // <-- TAMBAHAN: Buat baca database channel
import { getPlaylistTracks } from '../ytmusic.js';
import { getOdesliData } from '../songlink.js';
import { generateCaption } from '../caption.js';
import { updateBotPresence, sendAutoPostEmbed } from '../discord.js'; // <-- Panggil fungsi kirim asli
import { createMusicCard } from '../imageProcessor.js';
import { postToFacebook, commentOnPost } from '../facebook.js';
import { getRandomComment } from '../commentGenerator.js'; 

// Akses Database (Arahkan ke Volume)
const db = new Keyv('sqlite://data/db.sqlite');

async function getRandomTrack() {
    const playlist = await getPlaylistTracks();
    return playlist && playlist.length > 0 ? playlist[Math.floor(Math.random() * playlist.length)] : null;
}

export default {
  data: new SlashCommandBuilder()
    .setName('testpost')
    .setDescription('Simulate daily autopost (Sends REAL post to the configured channel).')
    .addStringOption(option =>
        option.setName('target')
            .setDescription('Choose platform')
            .setRequired(false) 
            .addChoices(
                { name: '🚀 All Platforms', value: 'all' },
                { name: '📘 Facebook Only', value: 'facebook' },
                { name: '👾 Discord Only', value: 'discord' }
            )
    ),

  async execute(interaction) {
    const target = interaction.options.getString('target') || 'all'; 

    try {
      await interaction.deferReply(); 

      // 1. CEK DATABASE CHANNEL (Wajib punya channel dulu)
      // Kita ambil channel ID milik server ini
      const savedChannelId = await db.get(`sub:${interaction.guildId}`);
      
      if (!savedChannelId) {
          return interaction.editReply({ 
              content: '❌ **Error:** No channel set for this server.\nPlease run `/setchannel` first to define where the post should go.' 
          });
      }

      // 2. Persiapan Data Lagu
      const initialTrack = await getRandomTrack();
      if (!initialTrack) return interaction.editReply({ content: '❌ Failed to fetch track.' });

      const odesliData = await getOdesliData(initialTrack.url);
      if (!odesliData) return interaction.editReply({ content: '❌ Failed to fetch Odesli.' });
      
      const finalTrack = { name: odesliData.title, artist: odesliData.artist };
      
      // Update status bot sekalian
      if (interaction.client) updateBotPresence(interaction.client, finalTrack); 

      // Hitung Hari
      const START_DATE = new Date(process.env.START_DATE || "2025-07-19");
      const dayNumber = Math.floor(Math.abs(new Date() - START_DATE) / (1000 * 60 * 60 * 24)) + 1;

      // 3. Generate Gambar & Caption
      const imageBuffer = await createMusicCard({
          imageUrl: odesliData.imageUrl,
          title: finalTrack.name,
          artist: finalTrack.artist,
          day: dayNumber
      });

      if (!imageBuffer) return interaction.editReply({ content: '❌ Image generation failed.' });

      const caption = await generateCaption({ day: dayNumber, title: finalTrack.name, artist: finalTrack.artist, link: odesliData.pageUrl });
      const engagementComment = await getRandomComment(finalTrack.name, finalTrack.artist);

      // --- EKSEKUSI ---
      
      let fbStatus = "Skipped ⏩";
      let discordStatus = "Skipped ⏩";

      // A. FACEBOOK POST
      if (target === 'all' || target === 'facebook') {
          if (process.env.FACEBOOK_PAGE_ID) {
              const postId = await postToFacebook(imageBuffer, caption);
              if (postId) {
                 fbStatus = `✅ Posted (ID: ${postId})`;
                 await commentOnPost(postId, engagementComment);
              } else fbStatus = "❌ Failed";
          } else {
              fbStatus = "⚠️ No Config";
          }
      }

      // B. DISCORD POST (Output 2: The Real Post)
      // Ini akan mengirim ke Channel yang sudah di-set, bukan ke channel tempat ngetik command
      if (target === 'all' || target === 'discord') {
         try {
             await sendAutoPostEmbed({
                 client: interaction.client,
                 comment: engagementComment,
                 caption: caption,
                 imageUrl: odesliData.imageUrl,
                 imageBuffer: imageBuffer,
                 channelId: savedChannelId // <--- KIRIM KE SINI
             });
             discordStatus = `✅ Sent to <#${savedChannelId}>`;
         } catch (err) {
             discordStatus = `❌ Failed: ${err.message}`;
         }
      }

      // 5. Output 1: Laporan status ke User (Ephemeral report)
      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle(`🧪 Autopost Simulation Complete`)
        .setDescription(`**Day #${dayNumber}** - ${finalTrack.name}`)
        .addFields(
            { name: 'Target Channel', value: `<#${savedChannelId}>`, inline: true },
            { name: 'Discord Status', value: discordStatus, inline: true },
            { name: 'Facebook Status', value: fbStatus, inline: true },
        )
        .setTimestamp();
      
      // Kirim laporan teks saja (gambarnya kan udah dikirim ke channel tujuan)
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Error executing testpost.' });
    }
  }
};