// src/commands/music.js

import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { getPlaylistTracks } from '../ytmusic.js';
import { getOdesliData } from '../songlink.js';
import { createMusicCard } from '../imageProcessor.js'; // <--- Kembalikan fitur gambar
import { checkUserLimit, incrementUserLimit } from '../utils/limiter.js'; 

const MUSIC_LIMIT = 5; // Batas kuota harian

export default {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Get a random aesthetic music recommendation.'),

  async execute(interaction) {
    // 1. CEK LIMIT DULU
    const limitStatus = await checkUserLimit(interaction.user.id, 'music', MUSIC_LIMIT);
    
    if (!limitStatus.allowed) {
        return interaction.reply({ content: limitStatus.message, ephemeral: true });
    }

    await interaction.deferReply();

    try {
        // 2. Ambil Lagu Random dari Playlist
        const playlist = await getPlaylistTracks();
        if (!playlist || playlist.length === 0) {
            return interaction.editReply('❌ Playlist is empty or cannot be reached.');
        }
        
        const randomTrack = playlist[Math.floor(Math.random() * playlist.length)];

        // 3. Ambil Data Odesli (Link Universal & Gambar HD)
        const odesliData = await getOdesliData(randomTrack.url);
        
        // Data Fallback kalau Odesli gagal
        const finalTitle = odesliData ? odesliData.title : randomTrack.title;
        const finalArtist = odesliData ? odesliData.artist : randomTrack.artist;
        const finalImage = odesliData ? odesliData.imageUrl : randomTrack.thumbnails[randomTrack.thumbnails.length - 1].url;
        const finalLink = odesliData ? odesliData.pageUrl : randomTrack.url;

        // 4. GENERATE GAMBAR KARTU 
        const imageBuffer = await createMusicCard({
            imageUrl: finalImage,
            title: finalTitle,
            artist: finalArtist,
            topText: "RECOMMENDED" // Tag khusus buat command ini
        });

        if (!imageBuffer) {
            return interaction.editReply(`🎵 **${finalTitle}**\n🔗 ${finalLink}\n*(Image generation failed)*`);
        }

        // 5. SUKSES? POTONG KUOTA
        await incrementUserLimit(interaction.user.id, 'music');

        // 6. Kirim Hasil (Gambar + Embed)
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'recommendation.png' });
        
        // Hitung sisa kuota
        const sisa = limitStatus.usageCount !== undefined ? (MUSIC_LIMIT - (limitStatus.usageCount + 1)) : '∞';
        const footerText = `Music Discovery • Daily Quota: ${sisa}/${MUSIC_LIMIT}`;

        const embed = new EmbedBuilder()
            .setColor('Random')
            .setTitle(`🎵 ${finalTitle} - ${finalArtist}`)
            .setURL(finalLink)
            .setImage('attachment://recommendation.png')
            .setFooter({ text: footerText });

        await interaction.editReply({ 
            content: `Here is a random pick for you, ${interaction.user}!`,
            embeds: [embed], 
            files: [attachment] 
        });

    } catch (error) {
        console.error("Error in /music:", error);
        await interaction.editReply('❌ Failed to fetch music recommendation.');
    }
  }
};