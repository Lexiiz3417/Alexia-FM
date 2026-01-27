// src/commands/removechannel.js
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Keyv from 'keyv';

const db = new Keyv('sqlite://data/db.sqlite');

export default {
  data: new SlashCommandBuilder()
    .setName('removechannel')
    .setDescription('Stop daily music autopost for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guildId;

    try {
        // Hapus berdasarkan Key Guild ID
        await db.delete(`sub:${guildId}`);
        await interaction.reply({ content: '🔕 Autopost has been disabled for this server.', ephemeral: true });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: '❌ Error accessing database.', ephemeral: true });
    }
  }
};