// src/commands/removechannel.js
import { SlashCommandBuilder } from 'discord.js';
import Keyv from 'keyv';

const db = new Keyv('sqlite://db.sqlite');

export const data = new SlashCommandBuilder()
  .setName('removechannel')
  .setDescription('Stop receiving daily music posts on this server.')
  .setDefaultMemberPermissions('8');

export async function execute(interaction) {
  if (!interaction.member.permissions.has("Administrator")) {
    return interaction.reply({ content: 'Oops! Only server administrators can use this command.', ephemeral: true });
  }
  
  const serverId = interaction.guildId;
  const existingChannel = await db.get(serverId);

  if (!existingChannel) {
    return interaction.reply({
      content: 'This server isn\'t set up to receive daily posts yet.',
      ephemeral: true
    });
  }

  await db.delete(serverId);
  
  await interaction.reply({
    content: 'Got it! This server will no longer receive daily music posts.',
    ephemeral: true
  });
  console.log(`🗑️ Channel removed for server ${serverId}`);
}