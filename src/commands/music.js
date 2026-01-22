// src/commands/music.js

import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { getPlaylistTracks } from '../ytmusic.js';
import { getOdesliData } from '../songlink.js';
import { generateCaption } from '../caption.js';
import { updateBotPresence } from '../discord.js';
import { createMusicCard } from '../imageProcessor.js';

let cachedPlaylist = [];
let lastFetchTime = 0;

async function getRandomTrackFromYT() {
    const now = Date.now();
    if (now - lastFetchTime > 3600000 || cachedPlaylist.length === 0) {
        cachedPlaylist = await getPlaylistTracks();
        lastFetchTime = now;
    }
    return cachedPlaylist.length ? cachedPlaylist[Math.floor(Math.random() * cachedPlaylist.length)] : null;
}

export default {
  data: new SlashCommandBuilder().setName('music').setDescription('Get a random music recommendation!'),

  async execute(interaction) {
    try {
      await interaction.deferReply(); 
      
      const initialTrack = await getRandomTrackFromYT();
      if (!initialTrack) return interaction.editReply({ content: 'Failed to fetch playlist.' });

      const odesliData = await getOdesliData(initialTrack.url);
      if (!odesliData) return interaction.editReply({ content: 'Failed to get song info.' });
      
      const finalTrack = { name: odesliData.title, artist: odesliData.artist };
      updateBotPresence(interaction.client, finalTrack); 

      // --- PASS STRING INSTEAD OF NUMBER ---
      const imageBuffer = await createMusicCard({
          imageUrl: odesliData.imageUrl,
          title: finalTrack.name,
          artist: finalTrack.artist,
          day: "RECOMMENDED" // <--- Teks kustom untuk command manual
      });
      
      const caption = await generateCaption({ day: '✨', title: finalTrack.name, artist: finalTrack.artist, link: odesliData.pageUrl });

      const embed = new EmbedBuilder().setColor('Random').setDescription(caption).setTimestamp();
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'card.png' });
      embed.setImage('attachment://card.png');

      await interaction.editReply({ embeds: [embed], files: [attachment] });

    } catch (error) {
      console.error("Error /music:", error);
      await interaction.editReply({ content: 'Error.' });
    }
  }
};