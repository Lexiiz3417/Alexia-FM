// src/commands/music.js (VERSI UPGRADE)
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getPlaylistTracks } from '../ytmusic.js'; // <-- Ganti ke ytmusic.js
import { getUniversalLink } from '../songlink.js';
import { generateCaption } from '../caption.js';
import { updateBotPresence } from '../discord.js';

let cachedPlaylist = [];
let lastFetchTime = 0;

async function getRandomTrackFromYT() {
    const now = Date.now();
    // Cache playlist selama 1 jam biar gak fetch terus-terusan
    if (now - lastFetchTime > 3600000 || cachedPlaylist.length === 0) {
        console.log("Music command cache expired or empty. Refetching playlist...");
        cachedPlaylist = await getPlaylistTracks();
        lastFetchTime = now;
    }
    
    if (cachedPlaylist.length === 0) return null;
    
    // Pilih lagu secara acak dari cache
    return cachedPlaylist[Math.floor(Math.random() * cachedPlaylist.length)];
}

export default {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Get a random music recommendation from the YouTube playlist!'),

  async execute(interaction) {
    try {
      await interaction.deferReply(); 
      const track = await getRandomTrackFromYT();
      
      if (!track) {
          return interaction.editReply({ content: 'Sorry, I couldn\'t fetch the playlist right now. Please try again later.' });
      }

      updateBotPresence(interaction.client, track); 
      const universalLink = await getUniversalLink(track.url);
      
      const tempCaption = await generateCaption({ day: '✨', title: track.name, artist: track.artist, genre: track.genre, link: universalLink });
      const finalCaption = tempCaption.replace(/Day ✨ – /g, 'Music Pick');

      const embed = new EmbedBuilder().setColor('Random').setDescription(finalCaption).setImage(track.image).setTimestamp();
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Error executing /music command:", error);
      await interaction.editReply({ content: 'Oops! Something went wrong while fetching a song. Please try again later.' });
    }
  }
};