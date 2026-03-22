// src/commands/listhistory.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import sqlite3 from 'sqlite3';
import path from 'path';

export default {
    data: new SlashCommandBuilder()
        .setName('listhistory')
        .setDescription('OWNER ONLY: Intip 15 data terakhir di database history'),
    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: '⛔ Akses Ditolak!', flags: ['Ephemeral'] });
        }
        await interaction.deferReply({ flags: ['Ephemeral'] });

        const dbPath = path.resolve(process.cwd(), 'data', 'db.sqlite');
        const db = new sqlite3.Database(dbPath);

        db.all(`SELECT id, title, artist FROM play_history ORDER BY id DESC LIMIT 15`, [], (err, rows) => {
            db.close();
            if (err) return interaction.editReply(`❌ Error: ${err.message}`);
            if (!rows || rows.length === 0) return interaction.editReply('📭 Database history kosong.');

            // Bikin list rapi biar gampang di-copy
            const textList = rows.map(r => `🔹 \`${r.title}\`\n👤 \`${r.artist}\`\n`).join('\n');
            
            const embed = new EmbedBuilder()
                .setTitle('📜 15 Riwayat Terakhir di Database')
                .setDescription(textList)
                .setColor('#3498db')
                .setFooter({ text: 'Tinggal copy text merah (Highlight) biar gak typo pas cleanhistory' });

            interaction.editReply({ embeds: [embed] });
        });
    }
};