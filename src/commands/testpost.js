// src/commands/testpost.js

import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { getPlaylistTracks } from '../ytmusic.js';
import { getOdesliData } from '../songlink.js';
import { generateCaption } from '../caption.js';
import { updateBotPresence } from '../discord.js';
import { createMusicCard } from '../imageProcessor.js';
import { postToFacebook, commentOnPost } from '../facebook.js';
import { getRandomComment } from '../commentGenerator.js'; 
import { postToTelegram } from '../telegram.js'; // Pastikan path import benar

async function getRandomTrack() {
    const playlist = await getPlaylistTracks();
    return playlist && playlist.length > 0 ? playlist[Math.floor(Math.random() * playlist.length)] : null;
}

export default {
  data: new SlashCommandBuilder()
    .setName('testpost')
    .setDescription('OWNER ONLY: Simulate daily autopost with options.')
    .addStringOption(option =>
        option.setName('target')
            .setDescription('Choose which platform to test')
            .setRequired(false) // Gak wajib, kalau kosong berarti "ALL"
            .addChoices(
                { name: '🚀 All Platforms', value: 'all' },
                { name: '📘 Facebook Only', value: 'facebook' },
                { name: '✈️ Telegram Only', value: 'telegram' },
                { name: '👾 Discord Generation Only', value: 'discord' }
            )
    ),

  async execute(interaction) {
    // Security Check (Opsional: Kalau mau hanya owner yg bisa)
    // if (interaction.user.id !== process.env.OWNER_ID) return interaction.reply({ content: '⛔️', ephemeral: true });

    const target = interaction.options.getString('target') || 'all'; // Default 'all'

    try {
      await interaction.deferReply(); 
      
      // 1. Persiapan Data (Selalu jalan apapun opsinya)
      const initialTrack = await getRandomTrack();
      if (!initialTrack) return interaction.editReply({ content: '❌ Failed to fetch track.' });

      const odesliData = await getOdesliData(initialTrack.url);
      if (!odesliData) return interaction.editReply({ content: '❌ Failed to fetch Odesli.' });
      
      const finalTrack = { name: odesliData.title, artist: odesliData.artist };
      updateBotPresence(interaction.client, finalTrack); 

      // Calc Day
      const START_DATE = new Date(process.env.START_DATE || "2025-07-19");
      const dayNumber = Math.floor(Math.abs(new Date() - START_DATE) / (1000 * 60 * 60 * 24)) + 1;

      // 2. Generate Gambar & Teks
      const imageBuffer = await createMusicCard({
          imageUrl: odesliData.imageUrl,
          title: finalTrack.name,
          artist: finalTrack.artist,
          day: dayNumber
      });

      if (!imageBuffer) return interaction.editReply({ content: '❌ Image generation failed.' });

      const caption = await generateCaption({ day: dayNumber, title: finalTrack.name, artist: finalTrack.artist, link: odesliData.pageUrl });
      const engagementComment = await getRandomComment(finalTrack.name, finalTrack.artist);

      // --- LOGIKA PEMILIHAN PLATFORM ---
      
      let fbStatus = "Skipped ⏩";
      let teleStatus = "Skipped ⏩";

      // 3. Test FACEBOOK (Jika target 'all' atau 'facebook')
      if (target === 'all' || target === 'facebook') {
          if (process.env.FACEBOOK_PAGE_ID) {
              const postId = await postToFacebook(imageBuffer, caption);
              if (postId) {
                 fbStatus = `✅ ID: ${postId}`;
                 await commentOnPost(postId, engagementComment);
              } else fbStatus = "❌ Failed";
          } else {
              fbStatus = "⚠️ No Config";
          }
      }

      // 4. Test TELEGRAM (Jika target 'all' atau 'telegram')
      if (target === 'all' || target === 'telegram') {
          if (process.env.TELEGRAM_BOT_TOKEN) {
              const success = await postToTelegram(imageBuffer, caption, engagementComment);
              teleStatus = success ? "✅ Sent" : "❌ Failed";
          } else {
              teleStatus = "⚠️ No Config";
          }
      }

      // 5. Laporan ke Discord (Selalu dikirim sebagai bukti test)
      const embed = new EmbedBuilder()
        .setColor('Random')
        .setTitle(`🧪 Test Result: ${target.toUpperCase()}`)
        .setDescription(caption)
        .addFields(
            { name: 'Target Mode', value: target, inline: true },
            { name: 'FB Status', value: fbStatus, inline: true },
            { name: 'Tele Status', value: teleStatus, inline: true },
            { name: 'Auto Comment', value: engagementComment, inline: false }
        )
        .setFooter({ text: `Test Day #${dayNumber}` })
        .setTimestamp();
      
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'card.png' });
      embed.setImage('attachment://card.png');

      await interaction.editReply({ embeds: [embed], files: [attachment] });

    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Error executing testpost.' });
    }
  }
};