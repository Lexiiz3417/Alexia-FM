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
            const initialTrack = await getRandomTrack();
            if (!initialTrack) return interaction.editReply({ content: '❌ Failed to fetch track.' });

            const odesliData = await getOdesliData(initialTrack.url);
            if (!odesliData) return interaction.editReply({ content: '❌ Failed to fetch Odesli.' });
            
            // 🌟 METADATA PRIORITY: Keep YouTube's complete artist list!
            let trackTitle = odesliData.title || initialTrack.name;
            let trackArtist = initialTrack.artist || odesliData.artist; 
            let trackCover = odesliData.imageUrl || initialTrack.image;

            // 1. REFINEMENT METADATA (HD Cover & Clean Text)
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

            // 2. GENERATE IMAGE
            const songObj = { title: trackTitle, artist: trackArtist, coverUrl: trackCover };
            const imageBuffer = await generateNowPlayingImage(songObj, `TEST DAY #${dayNumber}`);
            if (!imageBuffer) return interaction.editReply({ content: '❌ Image generation failed.' });

            logPlayHistory(trackTitle, trackArtist, interaction.user.id, 'testpost', trackCover);

            // 3. GENERATE CAPTION & COMMENT
            const caption = await generateCaption({ day: dayNumber, title: trackTitle, artist: trackArtist, link: odesliData.pageUrl });
            const engagementComment = await getRandomComment(trackTitle, trackArtist);

            let metaStatus = "⚪ *Skipped*";
            let discordStatus = "⚪ *Skipped*";
            let teleStatus = "⚪ *Skipped*";
            let waStatus = "⚪ *Skipped*";

            // --- 🚀 MULTI-PLATFORM DISPATCH ---

            // A. META (FB, IG, THREADS)
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

            // C. WHATSAPP (Japri CEO & Registered Group)
            if (target === 'all' || target === 'whatsapp') {
                try {
                    const waCaption = `${caption}\n\n💬 ${engagementComment}`;
                    
                    // 1. Report to CEO (Log)
                    const myWaNumber = "6285163133417@s.whatsapp.net";
                    await sendWhatsAppPost(myWaNumber, waCaption, imageBuffer);

                    // 2. Fetch & Send to Registered Group from Database
                    const registeredGroupId = await db.get('wa_target_group');
                    if (registeredGroupId) {
                        await sendWhatsAppPost(registeredGroupId, waCaption, imageBuffer);
                        waStatus = "✅ **Sent to CEO & Group**";
                    } else {
                        waStatus = "✅ **Sent to CEO** (No group registered)";
                    }
                } catch (e) { 
                    waStatus = `❌ **Error:** ${e.message}`; 
                }
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

            // --- 4. RENDER REPORT ---
            const reportEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setAuthor({ name: 'Alexia Simulation', iconURL: interaction.client.user.displayAvatarURL() })
                .setTitle(`🧪 Simulation Complete: Day #${dayNumber}`)
                .setDescription(`Simulated a multi-platform post for **${trackTitle}**.`)
                .addFields(
                    { name: '🎵 Track', value: `**${trackTitle}**\n${trackArtist}`, inline: false },
                    { name: '🔹 Meta (FB, IG, Threads)', value: metaStatus, inline: false },
                    { name: '🔹 Discord', value: discordStatus, inline: true },
                    { name: '🔹 Telegram', value: teleStatus, inline: true },
                    { name: '🟢 WhatsApp', value: waStatus, inline: true }
                )
                .setThumbnail(trackCover)
                .setFooter({ text: `Testing Mode • Metadata & Group Sync Active` })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [reportEmbed] });

        } catch (error) {
            console.error("❌ TestPost Error:", error);
            if (interaction.deferred) await interaction.editReply({ content: '❌ **Simulation Failed:** Check terminal logs.' });
        }
    }
};