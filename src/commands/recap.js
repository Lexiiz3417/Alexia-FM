// src/commands/recap.js

import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { getTopSongs } from '../history.js';
import { generateRecapImage } from '../recapGenerator.js';
import Keyv from 'keyv';

// Inisialisasi database cooldown
const db = new Keyv({ namespace: 'cooldown_recap' });

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

        // Defer reply karena rendering butuh waktu
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
                return interaction.editReply(`❌ No music history found for the **${titleLabel}** period. Start playing some tunes first!`);
            }

            // 2. Generate gambar recap pake Canvas + Local Font
            const imageBuffer = await generateRecapImage(titleLabel, songs);

            if (!imageBuffer) {
                return interaction.editReply("❌ Failed to generate the recap image.");
            }

            // 3. Set cooldown (Hanya untuk user biasa)
            if (!isOwner) {
                await db.set(userId, Date.now());
            }

            // 4. Siapkan attachment dan embed
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'alexia-recap.png' });
            
            const embed = new EmbedBuilder()
                .setColor('#FFD700') // Yellow Gold
                .setTitle(`📊 Alexia ${titleLabel} Wrapped`)
                .setDescription(`Here are the most played tracks in this server!`)
                .setImage('attachment://alexia-recap.png')
                .setFooter({ text: isOwner ? 'Owner Mode: Unlimited Access' : 'Limit: 1 recap per day' })
                .setTimestamp();

            // Kirim hasil akhir
            await interaction.editReply({
                embeds: [embed],
                files: [attachment]
            });

        } catch (error) {
            console.error("❌ Recap Command Error:", error);
            await interaction.editReply("❌ An error occurred while retrieving data or rendering the image.");
        }
    }
};