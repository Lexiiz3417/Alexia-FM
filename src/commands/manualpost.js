// src/commands/manualpost.js

import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { getOdesliData } from '../songlink.js';
import { generateNowPlayingImage } from '../imageProcessor.js';
import { getTrackInfo } from '../coverFinder.js';
import { generateCaption } from '../caption.js';
import { getRandomComment } from '../commentGenerator.js';
import { postToFacebook, commentOnPost } from '../facebook.js';
import { postToTelegram } from '../telegram.js';
import { logPlayHistory } from '../history.js'; 
import { sendWhatsAppPost } from '../whatsapp.js'; // 🟢 IMPORT MESIN WA

const data = new SlashCommandBuilder()
    .setName('manualpost')
    .setDescription('Post manual untuk menambal Day # yang bolong (OWNER ONLY)')
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
                { name: '👾 Discord Saja', value: 'discord' },
                { name: '🟢 WhatsApp Saja', value: 'whatsapp' } // 🟢 OPSI BARU
            ));

async function execute(interaction) {
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
            return interaction.editReply("❌ Gagal mengambil metadata lagu dari link tersebut.");
        }

        let trackTitle = odesliData.title;
        let trackArtist = odesliData.artist;
        let trackCover = odesliData.imageUrl;

        const hdInfo = await getTrackInfo(trackTitle, trackArtist);
        if (hdInfo) {
            trackTitle = hdInfo.title || trackTitle;
            trackArtist = hdInfo.artist || trackArtist;
            if (hdInfo.coverUrl) trackCover = hdInfo.coverUrl;
        }

        const songObj = { title: trackTitle, artist: trackArtist, coverUrl: trackCover };
        const imageBuffer = await generateNowPlayingImage(songObj, day);

        if (!imageBuffer) return interaction.editReply("❌ Gagal merender gambar canvas.");

        logPlayHistory(trackTitle, trackArtist, interaction.user.id, 'manualpost', trackCover);

        const caption = await generateCaption({
            day: day,
            title: trackTitle,
            artist: trackArtist,
            link: odesliData.pageUrl
        });
        const engagementComment = await getRandomComment(trackTitle, trackArtist);

        let fbStatus = "⚪ *Skipped*";
        let teleStatus = "⚪ *Skipped*";
        let discordStatus = "⚪ *Skipped*";
        let waStatus = "⚪ *Skipped*"; // 🟢 STATUS WA

        // 📘 Facebook
        if (target === 'all' || target === 'facebook') {
            if (process.env.FACEBOOK_PAGE_ID) {
                const postId = await postToFacebook(imageBuffer, caption);
                if (postId) {
                    fbStatus = "✅ **Success**";
                    await commentOnPost(postId, engagementComment);
                } else fbStatus = "❌ **Failed**";
            } else fbStatus = "⚠️ **No Config**";
        }

        // ✈️ Telegram
        if (target === 'all' || target === 'telegram') {
            if (process.env.TELEGRAM_BOT_TOKEN) {
                try {
                    await postToTelegram(imageBuffer, caption, engagementComment);
                    teleStatus = "✅ **Success**";
                } catch (e) { teleStatus = `❌ **Failed**`; }
            } else teleStatus = "⚠️ **No Config**";
        }

        // 🟢 WhatsApp (NEW)
        if (target === 'all' || target === 'whatsapp') {
            try {
                const myWaNumber = "6285163133417@s.whatsapp.net";
                const waCaption = `${caption}\n\n💬 ${engagementComment}`;
                await sendWhatsAppPost(myWaNumber, waCaption, imageBuffer);
                waStatus = "✅ **Sent to CEO**";
            } catch (e) { waStatus = `❌ **Error:** ${e.message}`; }
        }

        // 👾 Discord
        if (target === 'all' || target === 'discord') {
            try {
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
                discordStatus = "✅ **Sent to Channel**";
            } catch (e) { discordStatus = "❌ **Failed**"; }
        }

        // --- RENDER EMBED REPORT ---
        const reportEmbed = new EmbedBuilder()
            .setColor('#b8256f')
            .setAuthor({ name: 'Manual Post Override', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(`✅ Successfully Reposted Day #${day}`)
            .setThumbnail(trackCover)
            .addFields(
                { name: '🎵 Song Info', value: `**${trackTitle}**\n${trackArtist}`, inline: false },
                { name: '📊 Distribution Report', value: 
                    `🔹 **Facebook:** ${fbStatus}\n` +
                    `🔹 **Telegram:** ${teleStatus}\n` +
                    `🔹 **WhatsApp:** ${waStatus}\n` + // 🟢 TAMPIL DI LAPORAN
                    `🔹 **Discord:** ${discordStatus}`, 
                  inline: false 
                }
            )
            .setFooter({ text: `Manual Log Recorded • Executed by ${interaction.user.username}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [reportEmbed] });

    } catch (error) {
        console.error("❌ Manual Post Error:", error);
        if (interaction.deferred) await interaction.editReply("❌ Kesalahan fatal saat memproses manual post.");
    }
}

export default { data, execute };