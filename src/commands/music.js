// src/commands/music.js

import { SlashCommandBuilder } from 'discord.js';
import { getPlaylistTracks } from '../ytmusic.js';
import { getOdesliData } from '../songlink.js';
import { checkUserLimit, incrementUserLimit } from '../utils/limiter.js'; // <--- IMPORT SATPAM

// LIMIT: 5x sehari (lebih longgar dari createcard karena cuma fetch teks/link)
const MUSIC_LIMIT = 5; 

export default {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Get a random music recommendation from the curated playlist.'),

  async execute(interaction) {
    // 1. CEK LIMIT DULU
    const limitStatus = await checkUserLimit(interaction.user.id, 'music', MUSIC_LIMIT);
    
    if (!limitStatus.allowed) {
        return interaction.reply({ content: limitStatus.message, ephemeral: true });
    }

    await interaction.deferReply();

    try {
        // Ambil lagu random
        const playlist = await getPlaylistTracks();
        if (!playlist || playlist.length === 0) {
            return interaction.editReply('❌ Playlist is empty or cannot be reached.');
        }
        
        const randomTrack = playlist[Math.floor(Math.random() * playlist.length)];

        // Ambil Data Odesli (Link Universal)
        const odesliData = await getOdesliData(randomTrack.url);
        
        if (!odesliData) {
            return interaction.editReply(`🎵 **${randomTrack.title}** by ${randomTrack.artist}\n🔗 ${randomTrack.url}`);
        }

        // 2. SUKSES? POTONG KUOTA
        await incrementUserLimit(interaction.user.id, 'music');

        // Kirim Hasil
        const sisa = limitStatus.usageCount !== undefined ? (MUSIC_LIMIT - (limitStatus.usageCount + 1)) : '∞';
        
        await interaction.editReply({ 
            content: `🎵 **Recommendation for You:**\n${odesliData.pageUrl}\n\n*Daily Quota: ${sisa}/${MUSIC_LIMIT}*` 
        });

    } catch (error) {
        console.error(error);
        await interaction.editReply('❌ Failed to fetch music.');
    }
  }
};