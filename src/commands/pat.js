// src/commands/pat.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getActionGif } from '../imageAPI.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pat')
    .setDescription('Give someone a gentle pat on the head.')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The person you want to pat')
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const author = interaction.user;
    const target = interaction.options.getUser('target');
    const gifUrl = await getActionGif('pat'); 

    if (!gifUrl) {
      return interaction.editReply('Couldn\'t find a pat GIF. My apologies!');
    }

    let description = '';
    if (target) {
      if (target.id === author.id) {
        description = `${author} pats their own head. Good job!`;
      } else {
        description = `**${author} gives ${target} a comforting pat.** So sweet!`;
      }
    } else {
      description = `**${author} pats the air gently.**`;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#3498DB') // Warna biru
      .setDescription(description)
      .setImage(gifUrl)
      .setFooter({ text: 'Powered by waifu.pics' });

    await interaction.editReply({ embeds: [embed] });
  },
};