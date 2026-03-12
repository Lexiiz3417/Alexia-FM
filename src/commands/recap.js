// src/commands/recap.js

import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { getTopSongs } from '../history.js';
import { generateRecapImage } from '../recapGenerator.js';

export default {
    data: new SlashCommandBuilder()
        .setName('recap')
        .setDescription('Generate Alexia Music Recap (Wrapped)')
        .addStringOption(option =>
            option.setName('period')
                .setDescription('Pilih periode recap')
                .setRequired(true)
                .addChoices(
                    { name: '📅 Weekly (Top 5)', value: 'weekly' },
                    { name: 'month Monthly (Top 7)', value: 'monthly' },
                    { name: '🏆 Yearly (Top 10)', value: 'yearly' }
                )),

    async execute(interaction) {
        await interaction.deferReply();

        const period = interaction.options.getString('period');
        
        // Konfigurasi Rentang & Limit
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
            // 1. Ambil data dari SQLite
            const songs = await getTopSongs(days, limit);

            if (!songs || songs.length === 0) {
                return interaction.editReply(`❌ Belum ada data history untuk periode **${titleLabel}**. Yuk puter musik dulu!`);
            }

            // 2. Generate Gambar via RecapGenerator
            // Pastikan generateRecapImage sudah lu save dengan logic Background Blur tadi
            const imageBuffer = await generateRecapImage(titleLabel, songs);

            if (!imageBuffer) {
                return interaction.editReply("❌ Gagal membuat gambar recap.");
            }

            // 3. Kirim ke Discord
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'alexia-recap.png' });
            
            const embed = new EmbedBuilder()
                .setColor('#b8256f')
                .setTitle(`📊 Alexia ${titleLabel} Wrapped`)
                .setDescription(`Ini adalah lagu-lagu yang paling sering diputar/dipost selama ${days} hari terakhir di server ini.`)
                .setImage('attachment://alexia-recap.png')
                .setFooter({ text: 'Alexia Music System • Data driven by History Log' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                files: [attachment]
            });

        } catch (error) {
            console.error("❌ Recap Command Error:", error);
            await interaction.editReply("❌ Terjadi kesalahan saat menarik data history.");
        }
    }
};