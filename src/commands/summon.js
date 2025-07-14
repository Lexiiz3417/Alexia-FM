// src/commands/summon.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
// Kita panggil 'mesin' canggih kita
import { searchWaifuIm } from '../imageAPI.js'; 

export default {
  data: new SlashCommandBuilder()
    .setName('summon')
    .setDescription('Summon a random image or GIF with specific tags!')
    .addStringOption(option =>
      option.setName('tags')
        .setDescription('Describe the image you want (e.g., maid, blonde, long_hair). Separate with commas.')
        .setRequired(false) // Tidak wajib diisi, bisa summon random
    )
    .addBooleanOption(option =>
      option.setName('gif_only')
        .setDescription('Set to true if you only want to summon a GIF.')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    // Ambil input dari user
    const tagsInput = interaction.options.getString('tags');
    const isGif = interaction.options.getBoolean('gif_only') || false;

    // Ubah input string menjadi array, bersihkan spasi, dan filter tag kosong
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    // Panggil mesin pencari kita dengan opsi yang sudah disiapkan
    const imageUrl = await searchWaifuIm({ tags, isGif });

    // Skenario 1: Gagal total (API error)
    if (imageUrl === null) {
      return interaction.editReply('The summoning ritual failed! The API might be down. Please try again later.');
    }

    // Skenario 2: Berhasil, tapi tidak ada gambar yang cocok
    if (imageUrl === 'not_found') {
      return interaction.editReply(`I couldn't find any images matching those tags. Try being a little less specific!`);
    }

    // Skenario 3: Berhasil!
    const embed = new EmbedBuilder()
      .setColor('#8E44AD') // Warna ungu misterius
      .setTitle('A wild image has been summoned!')
      .setImage(imageUrl)
      .setFooter({ text: 'Powered by waifu.im' });
      
    if (tags.length > 0) {
        embed.setDescription(`Summoned with tags: \`${tags.join(', ')}\``);
    }

    await interaction.editReply({ embeds: [embed] });
  },
};