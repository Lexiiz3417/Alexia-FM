// src/commands/testpost.js

import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import Keyv from 'keyv'; 
import { getPlaylistTracks } from '../ytmusic.js';
import { getOdesliData } from '../songlink.js';
import { generateCaption } from '../caption.js';
import { updateBotPresence, sendAutoPostEmbed } from '../discord.js'; 
import { generateNowPlayingImage } from '../imageProcessor.js';
import { getTrackInfo } from '../coverFinder.js'; 
import { postToFacebook, commentOnPost } from '../facebook.js';
import { getRandomComment } from '../commentGenerator.js'; 
import { postToTelegram } from '../telegram.js'; 
import { logPlayHistory } from '../history.js'; 
import { sendWhatsAppPost } from '../whatsapp.js'; // 🟢 IMPORT MESIN WA

const db = new Keyv();

async function getRandomTrack() {
    const playlist = await getPlaylistTracks();
    return playlist && playlist.length > 0 ? playlist[Math.floor(Math.random() * playlist.length)] : null;
}

export default {
    data: new SlashCommandBuilder()
        .setName('testpost')
        .setDescription('OWNER ONLY: Simulate daily autopost.')
        .addStringOption(option =>
            option.setName('target')
                .setDescription('Choose platform')
                .setRequired(false) 
                .addChoices(
                    { name: '🚀 All Platforms', value: 'all' },
                    { name: '📘 Facebook Only', value: 'facebook' },
                    { name: '✈️ Telegram Only', value: 'telegram' }, 
                    { name: '👾 Discord Only', value: 'discord' },
                    { name: '🟢 WhatsApp Only', value: 'whatsapp' } // 🟢 OPSI BARU
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
            if (!savedChannelId && target !== 'telegram' && target !== 'facebook' && target !== 'whatsapp') {
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

            const hdInfo = await getTrackInfo(trackTitle, trackArtist);
            if (hdInfo) {
                trackTitle = hdInfo.title || trackTitle;
                trackArtist = hdInfo.artist || trackArtist;
                if (hdInfo.coverUrl) trackCover = hdInfo.coverUrl;
            }

            const finalTrack = { name: trackTitle, artist: trackArtist };
            
            if (interaction.client) updateBotPresence(interaction.client, finalTrack); 

            const START_DATE = new Date(process.env.START_DATE || "2026-01-23");
            const dayNumber = Math.floor(Math.abs(new Date() - START_DATE) / (1000 * 60 * 60 * 24)) + 1;

            const songObj = {
                title: trackTitle,
                artist: trackArtist,
                coverUrl: trackCover
            };

            const imageBuffer = await generateNowPlayingImage(songObj, `TEST DAY #${dayNumber}`);
            if (!imageBuffer) return interaction.editReply({ content: '❌ Image generation failed.' });

            logPlayHistory(trackTitle, trackArtist, interaction.user.id, 'testpost', trackCover);

            const caption = await generateCaption({ day: dayNumber, title: trackTitle, artist: trackArtist, link: odesliData.pageUrl });
            const engagementComment = await getRandomComment(trackTitle, trackArtist);

            // --- 4. EKSEKUSI PLATFORM ---
            let fbStatus = "⚪ *Skipped*";
            let discordStatus = "⚪ *Skipped*";
            let teleStatus = "⚪ *Skipped*";
            let waStatus = "⚪ *Skipped*"; // 🟢 STATUS AWAL WA

            // A. FACEBOOK
            if (target === 'all' || target === 'facebook') {
                if (process.env.FACEBOOK_PAGE_ID) {
                    const postId = await postToFacebook(imageBuffer, caption);
                    if (postId) {
                        fbStatus = `✅ **Posted**`;
                        await commentOnPost(postId, engagementComment);
                    } else fbStatus = "❌ **Failed**";
                } else fbStatus = "⚠️ **No Config**";
            }

            // B. TELEGRAM
            if (target === 'all' || target === 'telegram') {
                if (process.env.TELEGRAM_BOT_TOKEN) {
                    const success = await postToTelegram(imageBuffer, caption, engagementComment);
                    teleStatus = success ? "✅ **Sent**" : "❌ **Failed**";
                } else teleStatus = "⚠️ **No Config**";
            }

            // C. WHATSAPP (🟢 NEW TARGET)
            if (target === 'all' || target === 'whatsapp') {
                try {
                    const myWaNumber = "6285163133417@s.whatsapp.net";
                    const waCaption = `${caption}\n\n💬 ${engagementComment}`;
                    await sendWhatsAppPost(myWaNumber, waCaption, imageBuffer);
                    waStatus = "✅ **Sent to CEO**";
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
                } catch (err) {
                    discordStatus = `❌ **Error:** ${err.message}`;
                }
            }

            // --- 5. RENDER LAPORAN ESTETIK ---
            const reportEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setAuthor({ name: 'System Simulation', iconURL: interaction.client.user.displayAvatarURL() })
                .setTitle(`🧪 Autopost Test Complete: Day #${dayNumber}`)
                .setDescription(`Successfully simulated a post for **${trackTitle}** by **${trackArtist}**.`)
                .addFields(
                    { name: '🌐 Platform Status', value: '\u200B' },
                    { name: '🔹 Discord', value: discordStatus, inline: true },
                    { name: '🔹 Facebook', value: fbStatus, inline: true },
                    { name: '🔹 Telegram', value: teleStatus, inline: true },
                    { name: '🟢 WhatsApp', value: waStatus, inline: true } // 🟢 FIELD BARU DI EMBED
                )
                .setThumbnail(trackCover)
                .setFooter({ text: `Admin: ${interaction.user.username} • History Logged`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [reportEmbed] });

        } catch (error) {
            console.error("❌ TestPost Error:", error);
            if (interaction.deferred) {
                await interaction.editReply({ content: '❌ **Simulation Failed:** Check terminal for details.' });
            }
        }
    }
};