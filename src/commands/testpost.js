// src/commands/testpost.js

import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import Keyv from 'keyv';
import { KeyvPostgres } from '@keyv/postgres';
import { getPlaylistTracks } from '../ytmusic.js';
import { getOdesliData } from '../songlink.js';
import { generateCaption } from '../caption.js';
import { updateBotPresence, sendAutoPostEmbed } from '../discord.js'; 
import { generateNowPlayingImage } from '../imageProcessor.js';
import { getTrackInfo, cleanMetadata } from '../coverFinder.js'; 
import { postToMeta } from '../meta.js'; // 🌟 Gunakan Meta Terpadu
import { getRandomComment } from '../commentGenerator.js'; 
import { postToTelegram } from '../telegram.js'; 
import { logPlayHistory } from '../history.js'; 
import { sendWhatsAppPost } from '../whatsapp.js'; 

const db = new Keyv({
    store: new KeyvPostgres({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    })
});

async function getRandomTrack() {
    const playlist = await getPlaylistTracks();
    return playlist && playlist.length > 0 ? playlist[Math.floor(Math.random() * playlist.length)] : null;
}

export default {
    data: new SlashCommandBuilder()
        .setName('testpost')
        .setDescription('OWNER ONLY: Simulate daily autopost with multi-platform support.')
        .addStringOption(option =>
            option.setName('target')
                .setDescription('Choose platform')
                .setRequired(false) 
                .addChoices(
                    { name: '🚀 All Platforms', value: 'all' },
                    { name: '📸 Meta (FB, IG, Threads)', value: 'meta' },
                    { name: '✈️ Telegram Only', value: 'telegram' }, 
                    { name: '👾 Discord Only', value: 'discord' },
                    { name: '🟢 WhatsApp Only', value: 'whatsapp' } 
                )
        ),

    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ 
                content: '⛔ **Access Denied.**\nThis command is restricted to the Bot Owner.', 
                flags: ['Ephemeral'] 
            });
        }

        const target = interaction.options.getString('target') || 'all'; 

        try {
            await interaction.deferReply(); 

            const savedChannelId = await db.get(`sub:${interaction.guildId}`);
            if (!savedChannelId && !['telegram', 'meta', 'whatsapp'].includes(target)) {
                return interaction.editReply({ 
                    content: '❌ **Error:** No Discord channel set. Run `/setchannel` first.' 
                });
            }

            const initialTrack = await getRandomTrack();
            if (!initialTrack) return interaction.editReply({ content: '❌ Failed to fetch track.' });

            const odesliData = await getOdesliData(initialTrack.url);
            if (!odesliData) return interaction.editReply({ content: '❌ Failed to fetch Odesli.' });
            
            let trackTitle = odesliData.title;
            let trackArtist = odesliData.artist;
            let trackCover = odesliData.imageUrl;

            // 1. REFINEMENT METADATA
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

            const finalTrack = { name: trackTitle, artist: trackArtist };
            if (interaction.client) updateBotPresence(interaction.client, finalTrack); 

            const START_DATE = new Date(process.env.START_DATE || "2026-01-23");
            const dayNumber = Math.floor(Math.abs(new Date() - START_DATE) / (1000 * 60 * 60 * 24)) + 1;

            const songObj = { title: trackTitle, artist: trackArtist, coverUrl: trackCover };

            // 2. GENERATE IMAGE
            const imageBuffer = await generateNowPlayingImage(songObj, `TEST DAY #${dayNumber}`);
            if (!imageBuffer) return interaction.editReply({ content: '❌ Image generation failed.' });

            logPlayHistory(trackTitle, trackArtist, interaction.user.id, 'testpost', trackCover);

            // 3. GENERATE CAPTION
            const caption = await generateCaption({ day: dayNumber, title: trackTitle, artist: trackArtist, link: odesliData.pageUrl });
            const engagementComment = await getRandomComment(trackTitle, trackArtist);

            let metaStatus = "⚪ *Skipped*";
            let discordStatus = "⚪ *Skipped*";
            let teleStatus = "⚪ *Skipped*";
            let waStatus = "⚪ *Skipped*";

            // A. META (FACEBOOK, INSTAGRAM, THREADS)
            if (target === 'all' || target === 'meta') {
                if (process.env.META_ACCESS_TOKEN) {
                    const report = await postToMeta(imageBuffer, caption, engagementComment);
                    metaStatus = `FB: ${report.facebook}\nIG: ${report.instagram}\nThreads: ${report.threads}`;
                } else metaStatus = "⚠️ **No Config**";
            }

            // B. TELEGRAM
            if (target === 'all' || target === 'telegram') {
                if (process.env.TELEGRAM_BOT_TOKEN) {
                    const success = await postToTelegram(imageBuffer, caption, engagementComment);
                    teleStatus = success ? "✅ **Sent**" : "❌ **Failed**";
                } else teleStatus = "⚠️ **No Config**";
            }

            // C. WHATSAPP
            if (target === 'all' || target === 'whatsapp') {
                try {
                    const myWaNumber = "6285163133417@s.whatsapp.net";
                    const waCaption = `${caption}\n\n💬 ${engagementComment}`;
                    await sendWhatsAppPost(myWaNumber, waCaption, imageBuffer);
                    waStatus = "✅ **Sent to CEO**";
                } catch (e) { waStatus = `❌ **Error:** ${e.message}`; }
            }

            // D. DISCORD
            if ((target === 'all' || target === 'discord') && savedChannelId) {
                try {
                    await sendAutoPostEmbed({
                        client: interaction.client,
                        comment: engagementComment,
                        caption: caption,
                        imageUrl: trackCover,
                        imageBuffer: imageBuffer,
                        channelId: savedChannelId 
                    });
                    discordStatus = `✅ **Sent** to <#${savedChannelId}>`;
                } catch (err) { discordStatus = `❌ **Error:** ${err.message}`; }
            }

            // --- 5. RENDER LAPORAN TEST ---
            const reportEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setAuthor({ name: 'System Simulation', iconURL: interaction.client.user.displayAvatarURL() })
                .setTitle(`🧪 Autopost Test Complete: Day #${dayNumber}`)
                .setDescription(`Simulated a multi-platform post for **${trackTitle}**.`)
                .addFields(
                    { name: '🎵 Song Information', value: `**${trackTitle}** by ${trackArtist}`, inline: false },
                    { name: '🔹 Meta (FB, IG, Threads)', value: metaStatus, inline: false },
                    { name: '🔹 Discord Status', value: discordStatus, inline: true },
                    { name: '🔹 Telegram Status', value: teleStatus, inline: true },
                    { name: '🟢 WhatsApp Status', value: waStatus, inline: true }
                )
                .setThumbnail(trackCover)
                .setFooter({ text: `Admin: ${interaction.user.username} • All Systems Tested`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [reportEmbed] });

        } catch (error) {
            console.error("❌ TestPost Error:", error);
            if (interaction.deferred) await interaction.editReply({ content: '❌ **Simulation Failed:** Check terminal for details.' });
        }
    }
};