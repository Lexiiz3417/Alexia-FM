// src/commands/testpost.js

import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { getPlaylistTracks } from '../ytmusic.js';
import { getOdesliData } from '../songlink.js';
import { generateCaption } from '../caption.js';
import { updateBotPresence } from '../discord.js';
import { createMusicCard } from '../imageProcessor.js';
// Hapus import uploadToImgbb
import { postToFacebook, commentOnPost } from '../facebook.js';

async function getRandomTrack() {
    const playlist = await getPlaylistTracks();
    return playlist && playlist.length > 0 ? playlist[Math.floor(Math.random() * playlist.length)] : null;
}

export default {
  data: new SlashCommandBuilder().setName('testpost').setDescription('OWNER ONLY: Simulate daily autopost.'),

  async execute(interaction) {
    if (interaction.user.id !== process.env.OWNER_ID) return interaction.reply({ content: '⛔️', ephemeral: true });

    try {
      await interaction.deferReply(); 
      
      const initialTrack = await getRandomTrack();
      if (!initialTrack) return interaction.editReply({ content: '❌ Failed to fetch track.' });

      const odesliData = await getOdesliData(initialTrack.url);
      if (!odesliData) return interaction.editReply({ content: '❌ Failed to fetch Odesli.' });
      
      const finalTrack = { name: odesliData.title, artist: odesliData.artist };
      updateBotPresence(interaction.client, finalTrack); 

      // Calc Day
      const START_DATE = new Date(process.env.START_DATE || "2025-07-19");
      const dayNumber = Math.floor(Math.abs(new Date() - START_DATE) / (1000 * 60 * 60 * 24)) + 1;

      const imageBuffer = await createMusicCard({
          imageUrl: odesliData.imageUrl,
          title: finalTrack.name,
          artist: finalTrack.artist,
          day: dayNumber
      });

      if (!imageBuffer) return interaction.editReply({ content: '❌ Image generation failed.' });

      const caption = await generateCaption({ day: dayNumber, title: finalTrack.name, artist: finalTrack.artist, link: odesliData.pageUrl });

      let fbStatus = "Skipped";
      if (process.env.FACEBOOK_PAGE_ID) {
          // UPDATE: Langsung kirim Buffer ke FB
          const postId = await postToFacebook(imageBuffer, caption);
          if (postId) {
             fbStatus = `✅ ID: ${postId}`;
             await commentOnPost(postId, "Thoughts? 👇");
          } else fbStatus = "❌ Failed";
      }

      const embed = new EmbedBuilder()
        .setColor('Random').setTitle(`🧪 Test Post (Day #${dayNumber})`).setDescription(caption)
        .addFields({ name: 'FB Status', value: fbStatus }).setTimestamp();
      
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'card.png' });
      embed.setImage('attachment://card.png');

      await interaction.editReply({ embeds: [embed], files: [attachment] });

    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Error.' });
    }
  }
};