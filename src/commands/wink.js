// src/commands/wink.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getActionGif } from '../imageAPI.js';

export default {
  data: new SlashCommandBuilder()
    .setName('wink')
    .setDescription('Send a cheeky wink.')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The person you want to wink at')
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const author = interaction.user;
    const target = interaction.options.getUser('target');
    const gifUrl = await getActionGif('wink'); 

    if (!gifUrl) {
      return interaction.editReply('Oops, something went wrong with the winking action.');
    }

    let description = '';
    if (target) {
      description = `**${author} winks at ${target}.** 😉`;
    } else {
      description = `**${author} winks at you!** 😉`;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#9B59B6') // Warna ungu
      .setDescription(description)
      .setImage(gifUrl)
      .setFooter({ text: 'Powered by waifu.pics' });

    await interaction.editReply({ embeds: [embed] });
  },
};