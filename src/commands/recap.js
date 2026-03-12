// src/commands/recap.js

import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { getTopSongs } from '../history.js';
// Import DUA fungsi generator sekaligus untuk A/B Testing
import { generateRecapCanvas, generateRecapSharp } from '../recapGenerator.js';
import Keyv from 'keyv';

// Inisialisasi database cooldown
const db = new Keyv('sqlite://data/db.sqlite', { namespace: 'cooldown_recap' });

export default {
    data: new SlashCommandBuilder()
        .setName('recap')
        .setDescription('Generate the music chart recap for this server')
        .addStringOption(option =>
            option.setName('period')
                .setDescription('Select the recap period')
                .setRequired(true)
                .addChoices(
                    { name: '📅 Weekly (Top 5)', value: 'weekly' },
                    { name: '🌙 Monthly (Top 7)', value: 'monthly' },
                    { name: '🏆 Yearly (Top 10)', value: 'yearly' }
                )),

    async execute(interaction) {
        const userId = interaction.user.id;
        
        // Ambil OWNER_ID dari Environment Variables (.env)
        const OWNER_ID = process.env.OWNER_ID;
        const isOwner = userId === OWNER_ID;

        // --- ⏳ COOLDOWN LOGIC (Bypassed for Owner) ---
        if (!isOwner) {
            const lastUsed = await db.get(userId);
            const now = Date.now();
            const cooldownAmount = 24 * 60 * 60 * 1000; // 24 hours

            if (lastUsed) {
                const expirationTime = lastUsed + cooldownAmount;
                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / (60 * 60 * 1000);
                    return interaction.reply({ 
                        content: `⏳ **Slow down!** You've already generated a recap today. Please try again in **${timeLeft.toFixed(1)} hours**.`, 
                        ephemeral: true 
                    });
                }
            }
        }

        // Defer reply karena rendering 2 gambar butuh waktu ekstra
        await interaction.deferReply();

        const period = interaction.options.getString('period');
        let days = 7;
        let limit = 5;
        let titleLabel = "WEEKLY";

        if (period === 'monthly') {
            days = 30;
            limit = 7;
            titleLabel = "MONTHLY";
        } else if (period === 'yearly') {
            days = 365;
            limit = 10;
            titleLabel = "YEARLY";
        }

        try {
            // 1. Ambil data history
            const songs = await getTopSongs(days, limit);

            if (!songs || songs.length === 0) {
                return interaction.editReply(`❌ No music history found for the **${titleLabel}** period.`);
            }

            // 2. Generate gambar recap pake 2 mesin (A/B Test)
            const canvasBuffer = await generateRecapCanvas(titleLabel, songs);
            const sharpBuffer = await generateRecapSharp(titleLabel, songs);

            if (!canvasBuffer || !sharpBuffer) {
                return interaction.editReply("❌ Failed to generate the recap images.");
            }

            // 3. Set cooldown (Hanya untuk user biasa)
            if (!isOwner) {
                await db.set(userId, Date.now());
            }

            // 4. Siapkan dua attachment
            const attachCanvas = new AttachmentBuilder(canvasBuffer, { name: 'recap-canvas.png' });
            const attachSharp = new AttachmentBuilder(sharpBuffer, { name: 'recap-sharp.png' });
            
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`📊 Alexia ${titleLabel} Wrapped - A/B TEST`)
                .setDescription(`Coba lu bandingin Lex, bagusan yang atas (Canvas) atau yang bawah (Sharp)?`)
                .setFooter({ text: isOwner ? 'Owner Mode: Unlimited Access' : 'Limit: 1 recap per day' })
                .setTimestamp();

            // Kirim Embed dan 2 gambar sekaligus
            await interaction.editReply({
                embeds: [embed],
                files: [attachCanvas, attachSharp] 
            });

        } catch (error) {
            console.error("❌ Recap Command Error:", error);
            await interaction.editReply("❌ An error occurred while retrieving data or rendering images.");
        }
    }
};