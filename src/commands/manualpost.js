// src/commands/manualpost.js

import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import Keyv from 'keyv';
import { KeyvPostgres } from '@keyv/postgres';
import { getOdesliData } from '../songlink.js';
import { generateNowPlayingImage } from '../imageProcessor.js';
import { getTrackInfo, cleanMetadata } from '../coverFinder.js'; 
import { generateCaption } from '../caption.js';
import { getRandomComment } from '../commentGenerator.js';
import { postToMeta } from '../meta.js'; 
import { postToTelegram } from '../telegram.js';
import { logPlayHistory } from '../history.js'; 
import { sendWhatsAppPost } from '../whatsapp.js'; 

// Initialize DB for WhatsApp Target Group retrieval
const db = new Keyv({
    store: new KeyvPostgres({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    })
});

const data = new SlashCommandBuilder()
    .setName('manualpost')
    .setDescription('Manually post a song to fill gaps in the Day # counter (OWNER ONLY)')
    .addStringOption(option =>
        option.setName('url')
            .setDescription('Song link (YouTube/Spotify/Apple Music)')
            .setRequired(true))
    .addIntegerOption(option =>
        option.setName('day')
            .setDescription('The Day number to post (e.g., 46)')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('target')
            .setDescription('Target platform (Default: All)')
            .setRequired(false) 
            .addChoices(
                { name: '🌐 All Platforms', value: 'all' },
                { name: '📸 Meta Ecosystem (FB, IG, Threads)', value: 'meta' },
                { name: '📱 Instagram Only', value: 'ig_only' },
                { name: '📘 Facebook Only', value: 'fb_only' },
                { name: '✈️ Telegram Channel', value: 'telegram' },
                { name: '👾 Discord Server', value: 'discord' },
                { name: '🟢 WhatsApp Broadcast', value: 'whatsapp' } 
            ));

async function execute(interaction) {
    const OWNER_ID = process.env.OWNER_ID; 

    // Security Check
    if (interaction.user.id !== OWNER_ID) {
        return interaction.editReply({ 
            content: '⛔ **Access Denied.** This command is restricted to the bot owner.', 
        });
    }

    // NOTE: deferReply() is handled globally in src/discord.js

    const url = interaction.options.getString('url');
    const day = interaction.options.getInteger('day');
    const target = interaction.options.getString('target') || 'all'; 

    try {
        // Fetch metadata via Odesli
        const odesliData = await getOdesliData(url);
        if (!odesliData) return interaction.editReply("❌ Failed to retrieve song metadata.");

        // 🌟 Capture the original full artist list for the caption footer
        const fullArtist = odesliData.artist;

        let trackTitle = odesliData.title;
        let trackArtist = fullArtist; // Default to full until refined
        let trackCover = odesliData.imageUrl;

        // 🌟 Refine metadata (Trimming to Main Artist for the Canvas/Image UI)
        const hdInfo = await getTrackInfo(trackTitle, trackArtist);
        if (hdInfo) {
            trackTitle = hdInfo.title || trackTitle;
            trackArtist = hdInfo.artist || trackArtist;
            if (hdInfo.coverUrl) trackCover = hdInfo.coverUrl;
        } else {
            const cleaned = cleanMetadata(trackTitle, trackArtist);
            trackTitle = cleaned.cleanTitle || trackTitle;
            trackArtist = cleaned.cleanArtist || trackArtist;
        }

        // Render Canvas Image using refined (Short) artist
        const songObj = { title: trackTitle, artist: trackArtist, coverUrl: trackCover };
        const imageBuffer = await generateNowPlayingImage(songObj, day);
        if (!imageBuffer) return interaction.editReply("❌ Failed to render canvas image.");

        logPlayHistory(trackTitle, trackArtist, interaction.user.id, 'manualpost', trackCover);

        // 🌟 Prepare Caption using both Narration Artist (Short) and Credit Artist (Full)
        const caption = await generateCaption({
            day: day,
            title: trackTitle,
            artist: trackArtist,
            full_artist: fullArtist,
            link: odesliData.pageUrl
        });
        const engagementComment = await getRandomComment(trackTitle, trackArtist);

        let metaStatus = "⚪ *Skipped*";
        let teleStatus = "⚪ *Skipped*";
        let discordStatus = "⚪ *Skipped*";
        let waStatus = "⚪ *Skipped*";

        // --- 🚀 DISPATCH LOGIC ---

        // Dispatch: Meta Ecosystem (FB, IG, Threads)
        if (['all', 'meta', 'ig_only', 'fb_only'].includes(target)) {
            if (process.env.META_ACCESS_TOKEN) {
                const report = await postToMeta(imageBuffer, caption, engagementComment, target);
                metaStatus = `FB: ${report.facebook}\nIG: ${report.instagram}\nThreads: ${report.threads}`;
            } else metaStatus = "⚠️ **No Config**";
        }

        // Dispatch: Telegram
        if (target === 'all' || target === 'telegram') {
            if (process.env.TELEGRAM_BOT_TOKEN) {
                try {
                    await postToTelegram(imageBuffer, caption, engagementComment);
                    teleStatus = "✅ **Success**";
                } catch (e) { teleStatus = `❌ **Failed**`; }
            } else teleStatus = "⚠️ **No Config**";
        }

        // Dispatch: WhatsApp
        if (target === 'all' || target === 'whatsapp') {
            try {
                const waCaption = `${caption}\n\n💬 ${engagementComment}`;
                const myWaNumber = "6285163133417@s.whatsapp.net";
                await sendWhatsAppPost(myWaNumber, waCaption, imageBuffer);

                const registeredGroupId = await db.get('wa_target_group');
                if (registeredGroupId) {
                    await sendWhatsAppPost(registeredGroupId, waCaption, imageBuffer);
                    waStatus = "✅ **Sent to CEO & Group**";
                } else {
                    waStatus = "✅ **Sent to CEO** (Group not set)";
                }
            } catch (e) { waStatus = `❌ **Error:** ${e.message}`; }
        }

        // Dispatch: Discord
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

        // Final Report Embed
        const reportEmbed = new EmbedBuilder()
            .setColor('#b8256f')
            .setAuthor({ name: 'Manual Post Override', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(`✅ Successfully Reposted Day #${day}`)
            .setThumbnail(trackCover)
            .addFields(
                { name: '🎵 Song Info', value: `**${trackTitle}**\n${trackArtist}`, inline: false },
                { name: '📊 Distribution Report', value: 
                    `🔹 **Meta:**\n${metaStatus}\n\n` +
                    `🔹 **Telegram:** ${teleStatus}\n` +
                    `🔹 **WhatsApp:** ${waStatus}\n` + 
                    `🔹 **Discord:** ${discordStatus}`, 
                  inline: false 
                }
            )
            .setFooter({ text: `Manual Log Recorded • Target: ${target}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [reportEmbed] });

    } catch (error) {
        console.error("❌ [ManualPost] Logic Error:", error);
        await interaction.editReply("❌ Fatal error during manual post processing.").catch(() => {});
    }
}

export default { data, execute };