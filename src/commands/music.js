// src/commands/music.js

import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { getPlaylistTracks } from '../ytmusic.js';
import { getOdesliData } from '../songlink.js';
import { generateNowPlayingImage } from '../imageProcessor.js'; 
import { getTrackInfo, cleanMetadata, forceHDYouTubeCover } from '../coverFinder.js'; // 🌟 Import lengkap
import { checkUserLimit, incrementUserLimit } from '../utils/limiter.js'; 
import { logPlayHistory } from '../history.js'; 

const MUSIC_LIMIT = 5; 

export default {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Get a random aesthetic music recommendation.'),

    async execute(interaction) {
        // 1. CEK LIMIT DULU
        const limitStatus = await checkUserLimit(interaction.user.id, 'music', MUSIC_LIMIT);
        
        if (!limitStatus.allowed) {
            return interaction.reply({ 
                content: limitStatus.message, 
                flags: ['Ephemeral'] 
            });
        }

        await interaction.deferReply();

        try {
            // 2. Ambil Lagu Random dari Playlist
            const playlist = await getPlaylistTracks();
            if (!playlist || playlist.length === 0) {
                return interaction.editReply('❌ Playlist is empty or cannot be reached.');
            }
            
            const randomTrack = playlist[Math.floor(Math.random() * playlist.length)];

            // 3. Ambil Data Odesli (Link Universal & Gambar)
            const odesliData = await getOdesliData(randomTrack.url);
            
            // Data Fallback
            let finalTitle = odesliData ? odesliData.title : randomTrack.title;
            let finalArtist = odesliData ? odesliData.artist : randomTrack.artist;
            let finalImage = odesliData ? odesliData.imageUrl : randomTrack.thumbnails[randomTrack.thumbnails.length - 1].url;
            const finalLink = odesliData ? odesliData.pageUrl : randomTrack.url;

            // 🌟 THE MAGIC: Saring pakai Deezer biar HD & Bersih!
            const hdInfo = await getTrackInfo(finalTitle, finalArtist);
            if (hdInfo) {
                finalTitle = hdInfo.title || finalTitle;
                finalArtist = hdInfo.artist || finalArtist;
                if (hdInfo.coverUrl) finalImage = hdInfo.coverUrl;
            } else {
                // 🌟 FALLBACK: Deezer Gagal? Cuci Metadata & Suntik HD YouTube
                const cleaned = cleanMetadata(finalTitle, finalArtist);
                finalTitle = cleaned.cleanTitle || finalTitle;
                finalArtist = cleaned.cleanArtist || finalArtist;
                finalImage = forceHDYouTubeCover(finalImage); 
            }

            // 4. GENERATE GAMBAR KARTU (High Quality 2K)
            const songObj = {
                title: finalTitle,
                artist: finalArtist,
                coverUrl: finalImage
            };

            const imageBuffer = await generateNowPlayingImage(songObj, "RECOMMENDED");

            if (!imageBuffer) {
                return interaction.editReply(`🎵 **${finalTitle}**\n🔗 ${finalLink}\n*(Image generation failed)*`);
            }

            // --- 5. PASANG CCTV (HISTORY LOG) ---
            logPlayHistory(finalTitle, finalArtist, interaction.user.id, 'music', finalImage);

            // 6. SUKSES? POTONG KUOTA
            await incrementUserLimit(interaction.user.id, 'music');

            // 7. Kirim Hasil (Gambar + Embed)
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'recommendation.png' });
            
            const used = (limitStatus.usageCount || 0) + 1;
            const sisa = Math.max(0, MUSIC_LIMIT - used);
            const footerText = `Music Discovery • Daily Quota: ${sisa}/${MUSIC_LIMIT} left`;

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
            console.error("❌ Error in /music:", error);
            if (interaction.deferred) {
                await interaction.editReply('❌ Failed to fetch music recommendation.');
            }
        }
    }
};