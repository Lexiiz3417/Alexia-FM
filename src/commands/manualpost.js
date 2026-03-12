// src/commands/manualpost.js

import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { getOdesliData } from '../songlink.js';
import { createMusicCard } from '../imageProcessor.js';
import { generateCaption } from '../caption.js';
import { getRandomComment } from '../commentGenerator.js';
import { postToFacebook, commentOnPost } from '../facebook.js';
import { postToTelegram } from '../telegram.js';

export const data = new SlashCommandBuilder()
    .setName('manualpost')
    .setDescription('Post manual untuk menambal Day # yang bolong')
    .addStringOption(option =>
        option.setName('url')
            .setDescription('Link lagu (YouTube/Spotify/Apple Music)')
            .setRequired(true))
    .addIntegerOption(option =>
        option.setName('day')
            .setDescription('Nomor Day yang ingin dipost (contoh: 46)')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('target')
            .setDescription('Platform tujuan posting (Default: All)')
            .setRequired(false) // Dibuat false biar kalau kosong, otomatis milih 'all'
            .addChoices(
                { name: '🌐 Semua Platform (All)', value: 'all' },
                { name: '📘 Facebook Saja', value: 'facebook' },
                { name: '✈️ Telegram Saja', value: 'telegram' },
                { name: '👾 Discord Saja', value: 'discord' }
            ));

export async function execute(interaction) {
    // Tahan reply karena proses generate gambar & post ke sosmed butuh waktu
    await interaction.deferReply({ flags: ['Ephemeral'] }); 

    const url = interaction.options.getString('url');
    const day = interaction.options.getInteger('day');
    const target = interaction.options.getString('target') || 'all'; // Default ke 'all' kalau gak diisi

    try {
        // 1. Fetch Data Lagu dari Odesli
        const odesliData = await getOdesliData(url);
        if (!odesliData) {
            return interaction.editReply("❌ Gagal mengambil metadata lagu dari link tersebut. Coba link lain.");
        }

        // 2. Generate Music Card
        const imageBuffer = await createMusicCard({
            imageUrl: odesliData.imageUrl,
            title: odesliData.title,
            artist: odesliData.artist,
            topText: day // Otomatis jadi "DAY #46"
        });

        if (!imageBuffer) {
            return interaction.editReply("❌ Gagal merender gambar canvas.");
        }

        // 3. Generate Caption & Engagement Comment
        const caption = await generateCaption({
            day: day,
            title: odesliData.title,
            artist: odesliData.artist,
            link: odesliData.pageUrl
        });
        const engagementComment = await getRandomComment(odesliData.title, odesliData.artist);

        // --- STATUS TRACKING ---
        let fbStatus = "➖ Diabaikan (Bukan Target)";
        let teleStatus = "➖ Diabaikan (Bukan Target)";
        let discordStatus = "➖ Diabaikan (Bukan Target)";

        // 4. Eksekusi Posting ke Facebook
        if (target === 'all' || target === 'facebook') {
            if (process.env.FACEBOOK_PAGE_ID) {
                const postId = await postToFacebook(imageBuffer, caption);
                if (postId) {
                    fbStatus = "✅ Sukses";
                    await commentOnPost(postId, engagementComment);
                } else {
                    fbStatus = "❌ Gagal (Cek log Railway)";
                }
            } else {
                fbStatus = "❌ Config Env FB Belum Diisi";
            }
        }

        // 5. Eksekusi Posting ke Telegram
        if (target === 'all' || target === 'telegram') {
            if (process.env.TELEGRAM_BOT_TOKEN) {
                try {
                    await postToTelegram(imageBuffer, caption, engagementComment);
                    teleStatus = "✅ Sukses";
                } catch (e) {
                    teleStatus = `❌ Gagal: ${e.message}`;
                }
            } else {
                teleStatus = "❌ Config Env Telegram Belum Diisi";
            }
        }

        // 6. Eksekusi Posting ke Discord
        if (target === 'all' || target === 'discord') {
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'music-card.png' });
            const embed = new EmbedBuilder()
                .setColor('#b8256f') 
                .setDescription(caption)
                .setImage('attachment://music-card.png');

            await interaction.channel.send({
                content: engagementComment,
                embeds: [embed],
                files: [attachment]
            });
            discordStatus = "✅ Terkirim di channel ini";
        }

        // 7. Kasih Laporan Eksekusi ke User (Hanya lu yang bisa lihat)
        await interaction.editReply({
            content: `**✅ Manual Post untuk Day #${day} Selesai!**\n\n**Status Distribusi (Target: ${target.toUpperCase()}):**\n📘 Facebook: ${fbStatus}\n✈️ Telegram: ${teleStatus}\n👾 Discord: ${discordStatus}\n\n🎵 *Lagu:* ${odesliData.title} - ${odesliData.artist}`
        });

    } catch (error) {
        console.error("❌ Manual Post Error:", error);
        await interaction.editReply("❌ Terjadi kesalahan fatal saat memproses manual post.");
    }
}