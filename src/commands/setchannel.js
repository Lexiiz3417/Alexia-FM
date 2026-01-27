// src/commands/setchannel.js
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Keyv from 'keyv';

const db = new Keyv('sqlite://data/db.sqlite');

export default {
  data: new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Set the channel for daily music autopost.')
    .addChannelOption(option => 
        option.setName('channel')
        .setDescription('The channel to send updates to')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Hanya Admin

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;

    // VALIDASI: Pastikan channel teks
    if (!channel.isTextBased()) {
        return interaction.reply({ content: '❌ Please select a text channel!', ephemeral: true });
    }

    try {
        await interaction.deferReply({ ephemeral: true });

        // LOGIKA BARU: Gunakan Guild ID sebagai Kunci (Key)
        // Format Key: "sub:<guild_id>"
        // Ini menjamin 1 Server hanya punya 1 Channel aktif.
        await db.set(`sub:${guildId}`, channel.id);

        await interaction.editReply(`✅ **Success!** Daily music will be posted in ${channel}. (Previous settings for this server were overwritten)`);
    } catch (error) {
        console.error(error);
        await interaction.editReply('❌ Database error.');
    }
  }
};