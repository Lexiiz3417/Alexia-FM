// src/discord.js (VERSI DISEMPURNAKAN)
import { Events, EmbedBuilder, ActivityType } from "discord.js";
import Keyv from "keyv";

const db = new Keyv('sqlite://db.sqlite');

// Terima `client` sebagai argumen, jangan buat sendiri
export function updateBotPresence(client, track) {
  if (!client.user) return;
  client.user.setActivity(track.name, {
    type: ActivityType.Listening,
    state: `by ${track.artist}`,
  });
  console.log(`✅ Bot presence updated: Listening to ${track.name} by ${track.artist}`);
}

// Fungsi ini sekarang menerima 'client' secara eksplisit
export function startDiscordBot(client) {
  client.once(Events.ClientReady, c => {
    console.log(`🎧 DJ ${c.user.tag} is ready to serve!`);
    c.user.setActivity('music for the world', { type: ActivityType.Listening });
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    }
  });

  if (!process.env.DISCORD_TOKEN) {
    console.warn("❗ DISCORD_TOKEN not found, bot will not start.");
    return;
  }
  client.login(process.env.DISCORD_TOKEN);
}

// Terima `client` sebagai argumen, buang penggunaan variabel global
export async function sendAutoPostEmbed({ client, caption, imageUrl, channelId }) {
  const channel = client.channels.cache.get(channelId);
  
  if (!channel) {
    console.warn(`❗ Channel with ID ${channelId} not found. Removing from DB.`);
    let serverId;
    for await(const [key, value] of db.iterator()) {
        if (value === channelId) {
            serverId = key;
            break;
        }
    }
    if (serverId) await db.delete(serverId);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('Random')
    .setDescription(caption)
    .setImage(imageUrl)
    .setTimestamp();
  
  await channel.send({ embeds: [embed] });
}