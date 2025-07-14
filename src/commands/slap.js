// src/commands/slap.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getActionGif } from '../imageAPI.js'; // Pastikan path ini benar

export default {
  data: new SlashCommandBuilder()
    .setName('slap')
    .setDescription('Slap someone with dramatic effect!')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The person you want to slap')
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const author = interaction.user;
    const target = interaction.options.getUser('target');
    const gifUrl = await getActionGif('slap'); 

    if (!gifUrl) {
      return interaction.editReply('Sorry, couldn\'t get a slap GIF right now. Try again!');
    }

    let description = '';
    if (target) {
      if (target.id === author.id) {
        description = `${author} tries to slap themselves, but ends up just looking silly.`;
      } else {
        description = `**Ouch! ${author} just slapped ${target}!** That's gotta sting.`;
      }
    } else {
      description = `**${author} slaps the air with determination!** A true warrior.`;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#F1C40F') // Warna kuning
      .setDescription(description)
      .setImage(gifUrl)
      .setFooter({ text: 'Powered by waifu.pics' });

    await interaction.editReply({ embeds: [embed] });
  },
};