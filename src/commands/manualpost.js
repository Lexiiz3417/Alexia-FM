// src/commands/manualpost.js

import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { getOdesliData } from '../songlink.js';
import { createMusicCard } from '../imageProcessor.js';
import { generateCaption } from '../caption.js';
import { getRandomComment } from '../commentGenerator.js';
import { postToFacebook, commentOnPost } from '../facebook.js';
import { postToTelegram } from '../telegram.js';

// HILANGKAN kata 'export' di sini, ganti jadi const biasa
const data = new SlashCommandBuilder()
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
            .setRequired(false) 
            .addChoices(
                { name: '🌐 Semua Platform (All)', value: 'all' },
                { name: '📘 Facebook Saja', value: 'facebook' },
                { name: '✈️ Telegram Saja', value: 'telegram' },
                { name: '👾 Discord Saja', value: 'discord' }
            ));

// HILANGKAN kata 'export' di sini juga, ganti jadi async function biasa
async function execute(interaction) {
    await interaction.deferReply({ flags: ['Ephemeral'] }); 

    const url = interaction.options.getString('url');
    const day = interaction.options.getInteger('day');
    const target = interaction.options.getString('target') || 'all'; 

    try {
        const odesliData = await getOdesliData(url);
        if (!odesliData) {
            return interaction.editReply("❌ Gagal mengambil metadata lagu dari link tersebut. Coba link lain.");
        }

        const imageBuffer = await createMusicCard({
            imageUrl: odesliData.imageUrl,
            title: odesliData.title,
            artist: odesliData.artist,
            topText: day 
        });

        if (!imageBuffer) {
            return interaction.editReply("❌ Gagal merender gambar canvas.");
        }

        const caption = await generateCaption({
            day: day,
            title: odesliData.title,
            artist: odesliData.artist,
            link: odesliData.pageUrl
        });
        const engagementComment = await getRandomComment(odesliData.title, odesliData.artist);

        let fbStatus = "➖ Diabaikan (Bukan Target)";
        let teleStatus = "➖ Diabaikan (Bukan Target)";
        let discordStatus = "➖ Diabaikan (Bukan Target)";

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

        await interaction.editReply({
            content: `**✅ Manual Post untuk Day #${day} Selesai!**\n\n**Status Distribusi (Target: ${target.toUpperCase()}):**\n📘 Facebook: ${fbStatus}\n✈️ Telegram: ${teleStatus}\n👾 Discord: ${discordStatus}\n\n🎵 *Lagu:* ${odesliData.title} - ${odesliData.artist}`
        });

    } catch (error) {
        console.error("❌ Manual Post Error:", error);
        await interaction.editReply("❌ Terjadi kesalahan fatal saat memproses manual post.");
    }
}

export default {
    data,
    execute
};