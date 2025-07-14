import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getRandomTrack } from '../spotify.js';
import { getUniversalLink } from '../songlink.js';
import { generateCaption } from '../caption.js';
import { updateBotPresence } from '../discord.js';

// Membungkus semuanya dalam satu 'export default'
export default {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Get a random music recommendation!'),

  async execute(interaction) {
    try {
      await interaction.deferReply(); 
      const track = await getRandomTrack();
      // Kita perlu client untuk update presence, jadi kita ambil dari interaction
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