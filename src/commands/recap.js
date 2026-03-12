// src/commands/recap.js

import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { getTopSongs } from '../history.js';
import { generateRecapImage } from '../recapGenerator.js';
import Keyv from 'keyv';

// Inisialisasi database cooldown menggunakan Keyv (terpisah namespace)
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
        
        // --- 1. COOLDOWN LOGIC (24 Hours) ---
        const lastUsed = await db.get(userId);
        const now = Date.now();
        const cooldownAmount = 24 * 60 * 60 * 1000; // 24 hours in ms

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

        // Defer reply karena render canvas butuh waktu beberapa detik
        await interaction.deferReply();

        const period = interaction.options.getString('period');
        
        // Konfigurasi rentang hari dan limit lagu
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
            // --- 2. FETCH DATA FROM SQLITE ---
            const songs = await getTopSongs(days, limit);

            // Jika data history kosong (User belum pernah dengerin lagu)
            if (!songs || songs.length === 0) {
                return interaction.editReply(`❌ No music history found for the **${titleLabel}** period. Start playing some tunes first!`);
            }

            // --- 3. GENERATE THE IMAGE ---
            // Memanggil fungsi dari recapGenerator.js
            const imageBuffer = await generateRecapImage(titleLabel, songs);

            if (!imageBuffer) {
                return interaction.editReply("❌ Failed to generate the recap image. Please try again later.");
            }

            // Simpan waktu penggunaan terakhir setelah berhasil render
            await db.set(userId, now);

            // --- 4. SEND TO DISCORD ---
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'alexia-recap.png' });
            
            const embed = new EmbedBuilder()
                .setColor('#FFD700') // Yellow Gold matching the design
                .setTitle(`📊 Alexia ${titleLabel} Wrapped`)
                .setDescription(`Here are the most played tracks in this server over the past ${days} days!`)
                .setImage('attachment://alexia-recap.png')
                .setFooter({ text: 'Limit: 1 recap per day • Powered by Alexia History' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                files: [attachment]
            });

        } catch (error) {
            console.error("❌ Recap Command Error:", error);
            await interaction.editReply("❌ An error occurred while retrieving history data.");
        }
    }
};