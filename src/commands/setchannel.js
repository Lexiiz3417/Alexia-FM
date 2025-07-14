// src/commands/setchannel.js
import { SlashCommandBuilder, ChannelType } from 'discord.js';
import Keyv from 'keyv';

const db = new Keyv('sqlite://db.sqlite');

export const data = new SlashCommandBuilder()
  .setName('setchannel')
  .setDescription('Sets a channel to receive daily music posts.')
  .setDefaultMemberPermissions('8')
  .addChannelOption(option => 
    option.setName('channel')
      .setDescription('The channel to send daily posts to.')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  );

export async function execute(interaction) {
  if (!interaction.member.permissions.has("Administrator")) {
    return interaction.reply({ content: 'Oops! Only server administrators can use this command.', ephemeral: true });
  }

  const targetChannel = interaction.options.getChannel('channel');
  const serverId = interaction.guildId;
  const channelId = targetChannel.id;
  
  await db.set(serverId, channelId);
  
  await interaction.reply({ 
    content: `All set! The #${targetChannel.name} channel will now receive daily music posts from Alexia FM.`,
    ephemeral: true
  });
  console.log(`✅ Channel set for server ${serverId}: ${channelId} (${targetChannel.name})`);
}