// src/commands/testpost.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Keyv from 'keyv'; 
import { getPlaylistTracks } from '../ytmusic.js';
import { getOdesliData } from '../songlink.js';
import { generateCaption } from '../caption.js';
import { updateBotPresence, sendAutoPostEmbed } from '../discord.js'; 
import { createMusicCard } from '../imageProcessor.js';
import { postToFacebook, commentOnPost } from '../facebook.js';
import { getRandomComment } from '../commentGenerator.js'; 
import { postToTelegram } from '../telegram.js'; 

const db = new Keyv('sqlite://data/db.sqlite');

async function getRandomTrack() {
    const playlist = await getPlaylistTracks();
    return playlist && playlist.length > 0 ? playlist[Math.floor(Math.random() * playlist.length)] : null;
}

export default {
  data: new SlashCommandBuilder()
    .setName('testpost')
    .setDescription('OWNER ONLY: Simulate daily autopost.')
    .addStringOption(option =>
        option.setName('target')
            .setDescription('Choose platform')
            .setRequired(false) 
            .addChoices(
                { name: '🚀 All Platforms', value: 'all' },
                { name: '📘 Facebook Only', value: 'facebook' },
                { name: '✈️ Telegram Only', value: 'telegram' }, 
                { name: '👾 Discord Only', value: 'discord' }
            )
    ),

  async execute(interaction) {
    // 1. SECURITY CHECK: Cuma OWNER yang boleh lewat
    if (interaction.user.id !== process.env.OWNER_ID) {
        return interaction.reply({ 
            content: '⛔ **Access Denied.**\nThis command is restricted to the Bot Owner.', 
            ephemeral: true 
        });
    }

    // Kalau Owner, lanjut eksekusi tanpa limit...
    const target = interaction.options.getString('target') || 'all'; 

    try {
      await interaction.deferReply(); 

      const savedChannelId = await db.get(`sub:${interaction.guildId}`);
      if (!savedChannelId && target !== 'telegram' && target !== 'facebook') {
          return interaction.editReply({ 
              content: '❌ **Error:** No Discord channel set. Run `/setchannel` first.' 
          });
      }

      const initialTrack = await getRandomTrack();
      if (!initialTrack) return interaction.editReply({ content: '❌ Failed to fetch track.' });

      const odesliData = await getOdesliData(initialTrack.url);
      if (!odesliData) return interaction.editReply({ content: '❌ Failed to fetch Odesli.' });
      
      const finalTrack = { name: odesliData.title, artist: odesliData.artist };
      
      if (interaction.client) updateBotPresence(interaction.client, finalTrack); 

      const START_DATE = new Date(process.env.START_DATE || "2025-07-19");
      const dayNumber = Math.floor(Math.abs(new Date() - START_DATE) / (1000 * 60 * 60 * 24)) + 1;

      // Generate Image (Pakai ImageProcessor yang baru diperbaiki)
      const imageBuffer = await createMusicCard({
          imageUrl: odesliData.imageUrl,
          title: finalTrack.name,
          artist: finalTrack.artist,
          topText: `DAY #${dayNumber}`
      });

      if (!imageBuffer) return interaction.editReply({ content: '❌ Image generation failed.' });

      const caption = await generateCaption({ day: dayNumber, title: finalTrack.name, artist: finalTrack.artist, link: odesliData.pageUrl });
      const engagementComment = await getRandomComment(finalTrack.name, finalTrack.artist);

      // --- EKSEKUSI PLATFORM ---
      let fbStatus = "Skipped ⏩";
      let discordStatus = "Skipped ⏩";
      let teleStatus = "Skipped ⏩";

      // A. FACEBOOK
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

      // B. TELEGRAM
      if (target === 'all' || target === 'telegram') {
          if (process.env.TELEGRAM_BOT_TOKEN) {
              const success = await postToTelegram(imageBuffer, caption, engagementComment);
              teleStatus = success ? "✅ Sent" : "❌ Failed";
          } else {
              teleStatus = "⚠️ No Config";
          }
      }

      // C. DISCORD
      if ((target === 'all' || target === 'discord') && savedChannelId) {
         try {
             await sendAutoPostEmbed({
                 client: interaction.client,
                 comment: engagementComment,
                 caption: caption,
                 imageUrl: odesliData.imageUrl,
                 imageBuffer: imageBuffer,
                 channelId: savedChannelId 
             });
             discordStatus = `✅ Sent to <#${savedChannelId}>`;
         } catch (err) {
             discordStatus = `❌ Failed: ${err.message}`;
         }
      }

      // Laporan
      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle(`🧪 Autopost Simulation Complete`)
        .setDescription(`**Day #${dayNumber}** - ${finalTrack.name}`)
        .addFields(
            { name: 'Discord', value: discordStatus, inline: true },
            { name: 'Facebook', value: fbStatus, inline: true },
            { name: 'Telegram', value: teleStatus, inline: true },
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Error executing testpost.' });
    }
  }
};