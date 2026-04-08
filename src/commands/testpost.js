import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Keyv from 'keyv';
import { KeyvPostgres } from '@keyv/postgres';
import { getPlaylistTracks } from '../ytmusic.js';
import { getOdesliData } from '../songlink.js';
import { generateCaption } from '../caption.js';
import { updateBotPresence, sendAutoPostEmbed } from '../discord.js'; 
import { generateNowPlayingImage } from '../imageProcessor.js';
import { getTrackInfo, cleanMetadata } from '../coverFinder.js'; 
import { postToMeta } from '../meta.js'; 
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
        .setDescription('Simulate daily autopost with multi-platform support.')
        .addStringOption(option =>
            option.setName('target')
                .setDescription('Choose target platform')
                .setRequired(false) 
                .addChoices(
                    { name: '🚀 All Platforms', value: 'all' },
                    { name: '📸 Meta Ecosystem (FB, IG, Threads)', value: 'meta' },
                    { name: '📱 Instagram Only', value: 'ig_only' },
                    { name: '📘 Facebook Only', value: 'fb_only' },
                    { name: '✈️ Telegram Only', value: 'telegram' }, 
                    { name: '👾 Discord Only', value: 'discord' },
                    { name: '🟢 WhatsApp Only', value: 'whatsapp' } 
                )
        ),

    async execute(interaction) {
        // 🔒 Security Check
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.editReply({ 
                content: '⛔ **Access Denied.** This command is restricted to the bot owner.', 
            });
        }

        try {
            const target = interaction.options.getString('target') || 'all'; 
            const savedChannelId = await db.get(`sub:${interaction.guildId}`);
            
            const initialTrack = await getRandomTrack();
            if (!initialTrack) return interaction.editReply({ content: '❌ Failed to fetch track.' });

            const odesliData = await getOdesliData(initialTrack.url);
            if (!odesliData) return interaction.editReply({ content: '❌ Failed to fetch Odesli metadata.' });
            
            // 🌟 Capture the original full artist list from YouTube/Odesli
            const fullArtist = initialTrack.artist || odesliData.artist;

            let trackTitle = odesliData.title || initialTrack.name;
            let trackArtist = fullArtist; // Default to full until refined
            let trackCover = odesliData.imageUrl || initialTrack.image;

            // 🌟 Refine metadata (Trimming to Main Artist for the Canvas/Image)
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

            if (interaction.client) updateBotPresence(interaction.client, { name: trackTitle, artist: trackArtist }); 

            const START_DATE = new Date(process.env.START_DATE || "2026-01-23");
            const dayNumber = Math.floor(Math.abs(new Date() - START_DATE) / (1000 * 60 * 60 * 24)) + 1;

            // Generate Image using the refined (Short) artist name for better UI
            const songObj = { title: trackTitle, artist: trackArtist, coverUrl: trackCover };
            const imageBuffer = await generateNowPlayingImage(songObj, `TEST DAY #${dayNumber}`);
            if (!imageBuffer) return interaction.editReply({ content: '❌ Image generation failed.' });

            logPlayHistory(trackTitle, trackArtist, interaction.user.id, 'testpost', trackCover);

            // 🌟 Generate Caption with both Main Artist and Full Artist credit
            const caption = await generateCaption({ 
                day: dayNumber, 
                title: trackTitle, 
                artist: trackArtist, 
                full_artist: fullArtist,
                link: odesliData.pageUrl 
            });
            const engagementComment = await getRandomComment(trackTitle, trackArtist);

            let metaStatus = "⚪ *Skipped*";
            let discordStatus = "⚪ *Skipped*";
            let teleStatus = "⚪ *Skipped*";
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
                    const success = await postToTelegram(imageBuffer, caption, engagementComment);
                    teleStatus = success ? "✅ **Sent**" : "❌ **Failed**";
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
                        waStatus = "✅ **Sent to CEO** (No group registered)";
                    }
                } catch (e) { waStatus = `❌ **Error:** ${e.message}`; }
            }

            // Dispatch: Discord
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

            // Final Report Embed
            const reportEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setAuthor({ name: 'Alexia Simulation', iconURL: interaction.client.user.displayAvatarURL() })
                .setTitle(`🧪 Simulation Complete: Day #${dayNumber}`)
                .addFields(
                    { name: '🎵 Track', value: `**${trackTitle}**\n${trackArtist}`, inline: false },
                    { name: '🔹 Meta Status', value: metaStatus, inline: false },
                    { name: '🔹 Discord', value: discordStatus, inline: true },
                    { name: '🔹 Telegram', value: teleStatus, inline: true },
                    { name: '🟢 WhatsApp', value: waStatus, inline: true }
                )
                .setThumbnail(trackCover)
                .setFooter({ text: `Target: ${target} • All Credits Synchronized` })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [reportEmbed] });

        } catch (error) {
            console.error("❌ [TestPost] Logic Error:", error);
            await interaction.editReply({ content: '❌ **Simulation Failed:** Check logs.' }).catch(() => {});
        }
    }
};