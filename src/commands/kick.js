// src/commands/kick.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getActionGif } from '../imageAPI.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick someone (for fun, of course)!')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The person you want to kick')
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const author = interaction.user;
    const target = interaction.options.getUser('target');
    const gifUrl = await getActionGif('kick'); 

    if (!gifUrl) {
      return interaction.editReply('Sorry, the kick-o-matic is broken. Please try again!');
    }

    let description = '';
    if (target) {
      if (target.id === author.id) {
        description = `${author} somehow kicked themselves. Impressive flexibility!`;
      } else {
        description = `**${author} sends ${target} flying with a powerful kick!** 👟`;
      }
    } else {
      description = `**${author} is practicing their kicking form on thin air.**`;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#E74C3C') // Warna merah
      .setDescription(description)
      .setImage(gifUrl)
      .setFooter({ text: 'Powered by waifu.pics' });

    await interaction.editReply({ embeds: [embed] });
  },
};