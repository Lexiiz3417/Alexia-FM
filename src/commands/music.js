// src/commands/music.js

import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { getPlaylistTracks } from '../ytmusic.js';
import { getOdesliData } from '../songlink.js';
import { generateCaption } from '../caption.js';
import { updateBotPresence } from '../discord.js';
import { cropToSquare } from '../imageProcessor.js';

let cachedPlaylist = [];
let lastFetchTime = 0;

/**
 * Mengambil satu track mentah acak dari playlist YouTube, dengan sistem cache.
 * @returns {Promise<object|null>} Objek track mentah atau null jika gagal.
 */
async function getRandomTrackFromYT() {
    const now = Date.now();
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
    .setDescription('Get a random music recommendation!'),

  async execute(interaction) {
    try {
      await interaction.deferReply(); 
      
      // Langkah 1: Dapatkan track mentah dari playlist YouTube
      const initialTrack = await getRandomTrackFromYT();
      if (!initialTrack) {
          return interaction.editReply({ content: 'Sorry, I couldn\'t fetch the playlist right now. Please try again later.' });
      }

      // Langkah 2: Gunakan Odesli untuk mendapatkan data bersih
      const odesliData = await getOdesliData(initialTrack.url);
      if (!odesliData) {
        return interaction.editReply({ content: 'Oops! Failed to get detailed song info from Song.link. Please try again.' });
      }
      
      const finalTrack = {
        name: odesliData.title,
        artist: odesliData.artist,
      };

      updateBotPresence(interaction.client, finalTrack); 

      const imageBuffer = await cropToSquare(odesliData.imageUrl);
      
      const tempCaption = await generateCaption({ day: '✨', title: finalTrack.name, artist: finalTrack.artist, link: odesliData.pageUrl });
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
        embed.setImage(odesliData.imageUrl); // Fallback jika cropping gagal
      }

      await interaction.editReply(replyPayload);

    } catch (error) {
      console.error("Error executing /music command:", error);
      await interaction.editReply({ content: 'Oops! Something went wrong while fetching a song. Please try again later.' });
    }
  }
};