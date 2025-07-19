// src/commands/summon.js (Final - Dengan Akses Rating Q untuk Publik)

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { searchDanbooru } from '../imageAPI.js'; 

export default {
  data: new SlashCommandBuilder()
    .setName('summon')
    .setDescription('Summon a random image or GIF with specific tags!')
    .addStringOption(option =>
      option.setName('tags')
        .setDescription('Describe the image (e.g., maid, blonde). Separate with commas.')
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
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(Boolean => tag) : [];

    const result = await searchDanbooru({ tags, isGif });

    if (result === null) {
      return interaction.editReply('The summoning ritual failed! The API might be down.');
    }
    if (result === 'not_found') {
      return interaction.editReply(`I couldn't find any images matching those tags.`);
    }

    const isOwner = interaction.user.id === process.env.OWNER_ID;

    // =============================================================
    // LOGIKA BARU DENGAN ATURAN AKSES BARU
    // =============================================================

    // Kasus 1: Gambar aman (s) atau cukup aman (q)
    // Semua orang boleh lihat.
    if (result.rating === 's' || result.rating === 'q') {
      const embed = new EmbedBuilder()
        // Kita beri warna berbeda untuk rating 'q' sebagai penanda
        .setColor(result.rating === 's' ? '#0099FF' : '#F1C40F') // Biru untuk safe, Kuning untuk questionable
        .setTitle('A wild image has been summoned!')
        .setImage(result.file_url)
        .setFooter({ text: 'Powered by Danbooru' });
        
      if (tags.length > 0) {
          embed.setDescription(`Summoned with tags: \`${tags.join(', ')}\``);
      }
      return await interaction.editReply({ embeds: [embed] });
    }

    // Kasus 2: Gambar eksplisit (e)
    // Hanya owner yang boleh lihat, dan secara tersembunyi.
    if (result.rating === 'e') {
      if (isOwner) {
        // JIKA OWNER: Tampilkan gambar secara tersembunyi (ephemeral)
        console.log(`[OWNER ACCESS] Displaying '${result.rating}' rated post for owner.`);
        const embed = new EmbedBuilder()
          .setColor('#E74C3C') // Warna merah menandakan konten eksplisit
          .setTitle(`[OWNER-ONLY] An '${result.rating.toUpperCase()}' image has been summoned!`)
          .setImage(result.file_url)
          .setFooter({ text: 'Powered by Danbooru. This message is only visible to you.' });
        
        // Hapus balasan awal dan kirim yang baru dengan flag ephemeral
        await interaction.deleteReply();
        return await interaction.followUp({ embeds: [embed], flags: 64 });

      } else {
        // JIKA BUKAN OWNER: Tampilkan pesan peringatan dalam Bahasa Inggris.
        return await interaction.editReply('Whoa there! That summon is a bit too spicy for this channel. 🌶️ Please keep it SFW.');
      }
    }
    
    // Fallback untuk rating aneh lainnya
    return await interaction.editReply('An unknown content rating was found, cancelling the summon.');
    // =============================================================
  },
};