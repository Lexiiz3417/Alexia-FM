// src/commands/music.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getRandomTrack } from '../spotify.js';
import { getUniversalLink } from '../songlink.js';
import { generateCaption } from '../caption.js';
import { updateBotPresence } from '../discord.js';

export const data = new SlashCommandBuilder()
  .setName('music')
  .setDescription('Get a random music recommendation!');

export async function execute(interaction) {
  try {
    await interaction.deferReply(); 
    const track = await getRandomTrack();
    updateBotPresence(track);
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