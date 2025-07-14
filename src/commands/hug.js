// src/commands/hug.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getActionGif } from '../imageAPI.js'; 

export default {
  // DATA
  data: new SlashCommandBuilder()
    .setName('hug')
    .setDescription('Give someone a warm hug!')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The person you want to hug')
    ),

  // EXECUTE
  async execute(interaction) {
    await interaction.deferReply();

    const author = interaction.user;
    const target = interaction.options.getUser('target');
    const gifUrl = await getActionGif('hug'); 

    if (!gifUrl) {
      return interaction.editReply('Sorry, I couldn\'t find a hug GIF right now. Please try again!');
    }

    let description = '';
    if (target) {
      if (target.id === author.id) {
        description = `${author} is hugging themselves. Everyone needs a little self-love. 🤗`;
      } else {
        description = `**${author} gives ${target} a big, warm hug!** ❤️`;
      }
    } 
    else {
      description = `**${author} is sending a virtual hug to everyone!**`;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#FFB6C1')
      .setDescription(description)
      .setImage(gifUrl)
      .setFooter({ text: 'Powered by waifu.pics' });

    await interaction.editReply({ embeds: [embed] });
  },
};