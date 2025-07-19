// src/commands/summon.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { searchDanbooru } from '../imageAPI.js'; 

export default {
  data: new SlashCommandBuilder()
    .setName('summon')
    .setDescription('Summon a random image or GIF with specific tags!')
    .addStringOption(option =>
      option.setName('tags')
        .setDescription('Describe the image (e.g., maid, blonde, long_hair). Separate with commas.')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('gif_only')
        .setDescription('Set to true if you only want to summon a GIF.')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const tagsInput = interaction.options.getString('tags');
    const isGif = interaction.options.getBoolean('gif_only') || false;
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    const result = await searchDanbooru({ tags, isGif });

    if (result === null) {
      return interaction.editReply('The summoning ritual failed! The API might be down. Please try again later.');
    }
    if (result === 'not_found') {
      return interaction.editReply(`I couldn't find any images matching those tags. Try a different combination!`);
    }

    if (result.rating === 's') {
      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('A wild image has been summoned!')
        .setImage(result.file_url)
        .setFooter({ text: 'Powered by Danbooru' });
        
      if (tags.length > 0) {
          embed.setDescription(`Summoned with tags: \`${tags.join(', ')}\``);
      }
      await interaction.editReply({ embeds: [embed] });

    } else {
      await interaction.editReply('Heh, gak boleh ada unsur gituan yaaa! 😠');
    }
    // =============================================================
  },
};