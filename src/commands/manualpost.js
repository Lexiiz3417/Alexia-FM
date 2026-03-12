// src/commands/manualpost.js

import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { getOdesliData } from '../songlink.js';
import { createMusicCard } from '../imageProcessor.js';
import { generateCaption } from '../caption.js';
import { getRandomComment } from '../commentGenerator.js';
import { postToFacebook, commentOnPost } from '../facebook.js';
import { postToTelegram } from '../telegram.js';

const data = new SlashCommandBuilder()
    .setName('manualpost')
    .setDescription('OWNER ONLY: Post manual untuk menambal Day # yang bolong')
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

async function execute(interaction) {
    // --- OWNER CHECK ---
    const OWNER_ID = process.env.OWNER_ID; 

    if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ 
            content: '⛔ **Akses Ditolak!** Command ini eksklusif cuma bisa dipakai sama Owner bot.', 
            flags: ['Ephemeral'] 
        });
    }

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

        let fbStatus = "➖ *Diabaikan*";
        let teleStatus = "➖ *Diabaikan*";
        let discordStatus = "➖ *Diabaikan*";

        // Eksekusi FB
        if (target === 'all' || target === 'facebook') {
            if (process.env.FACEBOOK_PAGE_ID) {
                const postId = await postToFacebook(imageBuffer, caption);
                if (postId) {
                    fbStatus = "✅ **Sukses**";
                    await commentOnPost(postId, engagementComment);
                } else {
                    fbStatus = "❌ **Gagal** (Cek log)";
                }
            } else {
                fbStatus = "⚠️ Config FB Kosong";
            }
        }

        // Eksekusi Telegram
        if (target === 'all' || target === 'telegram') {
            if (process.env.TELEGRAM_BOT_TOKEN) {
                try {
                    await postToTelegram(imageBuffer, caption, engagementComment);
                    teleStatus = "✅ **Sukses**";
                } catch (e) {
                    teleStatus = `❌ **Gagal**`;
                }
            } else {
                teleStatus = "⚠️ Config Telegram Kosong";
            }
        }

        // Eksekusi Discord
        if (target === 'all' || target === 'discord') {
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'music-card.png' });
            const embed = new EmbedBuilder()
                .setColor('Random') 
                .setDescription(caption)
                .setImage('attachment://music-card.png');

            await interaction.channel.send({
                content: engagementComment,
                embeds: [embed],
                files: [attachment]
            });
            discordStatus = "✅ **Terkirim di channel ini**";
        }

        // --- BIKIN EMBED REPORT BIAR RAPI ---
        const reportEmbed = new EmbedBuilder()
            .setColor('#2ecc71') // Warna hijau sukses
            .setTitle(`✅ Manual Post Selesai! (Day #${day})`)
            .addFields(
                { name: '🎵 Info Lagu', value: `**${odesliData.title}**\n*${odesliData.artist}*`, inline: false },
                { name: '🎯 Target Distribusi', value: `\`${target.toUpperCase()}\``, inline: false },
                { 
                    name: '📊 Status Pengiriman', 
                    value: `📘 **Facebook:** ${fbStatus}\n✈️ **Telegram:** ${teleStatus}\n👾 **Discord:** ${discordStatus}`, 
                    inline: false 
                }
            )
            .setFooter({ text: `Manual override executed by ${interaction.user.tag}` })
            .setTimestamp();

        // Kirim report berupa Embed
        await interaction.editReply({
            content: '', // Kosongkan text raw
            embeds: [reportEmbed]
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