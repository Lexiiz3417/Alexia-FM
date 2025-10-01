// src/commands/music.js

import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { getPlaylistTracks } from '../ytmusic.js';
import { getUniversalLink } from '../songlink.js';
import { generateCaption } from '../caption.js';
import { updateBotPresence } from '../discord.js';
import { getHighResArtwork } from '../artworkFetcher.js';
import { cropToSquare } from '../imageProcessor.js';

let cachedPlaylist = [];
let lastFetchTime = 0;

/**
 * Mengambil satu lagu acak dari playlist, dengan sistem cache sederhana.
 * @returns {Promise<object|null>} Objek track atau null jika gagal.
 */
async function getRandomTrackFromYT() {
    const now = Date.now();
    // Cache playlist selama 1 jam (3600000 ms) untuk menghindari fetch berlebihan
    if (now - lastFetchTime > 3600000 || cachedPlaylist.length === 0) {
        console.log("Music command cache expired or empty. Refetching playlist...");
        cachedPlaylist = await getPlaylistTracks();
        lastFetchTime = now;
    }
    
    if (cachedPlaylist.length === 0) return null;
    
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

      // --- Pendekatan Hybrid untuk Cover Art ---
      const highResArt = await getHighResArtwork(track.name, track.artist);
      const finalImageUrl = highResArt || track.image;
      // -----------------------------------------

      const imageBuffer = await cropToSquare(finalImageUrl);
      const universalLink = await getUniversalLink(track.url);
      
      const tempCaption = await generateCaption({ day: '✨', title: track.name, artist: track.artist, genre: track.genre, link: universalLink });
      const finalCaption = tempCaption.replace(/Day ✨ – /g, 'Music Pick');

      const embed = new EmbedBuilder()
        .setColor('Random')
        .setDescription(finalCaption)
        .setTimestamp();
      
      const replyPayload = { embeds: [embed], fetchReply: true };

      if (imageBuffer) {
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'cover.png' });
        embed.setImage('attachment://cover.png');
        replyPayload.files = [attachment];
      } else {
        embed.setImage(finalImageUrl);
      }

      await interaction.editReply(replyPayload);

    } catch (error) {
      console.error("Error executing /music command:", error);
      await interaction.editReply({ content: 'Oops! Something went wrong while fetching a song. Please try again later.' });
    }
  }
};