// src/commands/createcard.js

import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { getOdesliData } from '../songlink.js';
import { createMusicCard } from '../imageProcessor.js';

export default {
  data: new SlashCommandBuilder()
    .setName('createcard')
    .setDescription('Create a aesthetic music card from a link or custom image.')
    .addStringOption(option => 
        option.setName('song_url')
            .setDescription('Link to the song (Spotify, SoundCloud, etc)')
            .setRequired(false))
    .addAttachmentOption(option => 
        option.setName('image')
            .setDescription('Upload your own cover image (Optional)')
            .setRequired(false))
    .addStringOption(option => 
        option.setName('title')
            .setDescription('Override/Set Song Title manually')
            .setRequired(false))
    .addStringOption(option => 
        option.setName('artist')
            .setDescription('Override/Set Artist Name manually')
            .setRequired(false))
    .addStringOption(option => 
        option.setName('tag')
            .setDescription('Top text (Default: SHARED)', )
            .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();

    try {
        // 1. Ambil Input User
        const songUrl = interaction.options.getString('song_url');
        const customImage = interaction.options.getAttachment('image');
        const customTitle = interaction.options.getString('title');
        const customArtist = interaction.options.getString('artist');
        const customTag = interaction.options.getString('tag') || "SHARED MUSIC";

        let finalTitle = "Unknown Title";
        let finalArtist = "Unknown Artist";
        let finalImageUrl = null;

        // Validasi: Minimal harus ada Link ATAU (Gambar + Judul)
        if (!songUrl && (!customImage || !customTitle)) {
            return interaction.editReply({ content: '❌ **Error:** Please provide either a **Song Link** OR upload an **Image + Title**.' });
        }

        // 2. Jika ada Link, fetch metadata dulu
        if (songUrl) {
            const odesliData = await getOdesliData(songUrl);
            if (odesliData) {
                finalTitle = odesliData.title;
                finalArtist = odesliData.artist;
                finalImageUrl = odesliData.imageUrl;
            } else if (!customTitle) {
                return interaction.editReply({ content: "❌ Couldn't fetch data from that link. Try entering Title manually." });
            }
        }

        // 3. Timpa dengan Input Manual (Jika User Maksa)
        if (customTitle) finalTitle = customTitle;
        if (customArtist) finalArtist = customArtist;
        if (customImage) finalImageUrl = customImage.url; // Prioritas gambar upload user

        // Cek apakah gambar ada
        if (!finalImageUrl) {
            return interaction.editReply({ content: "❌ No image source found. Please provide a link or upload an image." });
        }

        // 4. Generate Kartu
        const imageBuffer = await createMusicCard({
            imageUrl: finalImageUrl,
            title: finalTitle,
            artist: finalArtist,
            topText: customTag // Kirim teks custom
        });

        if (!imageBuffer) {
            return interaction.editReply({ content: '❌ Failed to generate image canvas.' });
        }

        // 5. Kirim Hasil
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'music-card.png' });
        await interaction.editReply({ 
            content: `🎨 **Card Created for ${interaction.user}**`, 
            files: [attachment] 
        });

    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ Something went wrong while creating the card.' });
    }
  }
};