// src/discord.js

import { 
  Client, 
  GatewayIntentBits, 
  Collection, 
  Events, 
  REST, 
  Routes, 
  EmbedBuilder, 
  AttachmentBuilder, 
  ActivityType 
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
* 1. FUNGSI UTAMA: MENYALAKAN BOT (STARTUP)
* Ini fungsi yang dicari oleh index.js tapi hilang tadi.
*/
export async function startDiscordBot() {
  const client = new Client({ 
      intents: [GatewayIntentBits.Guilds] 
  });

  client.commands = new Collection();
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  const commands = [];

  // Load semua command dari folder /commands
  for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const commandModule = await import(filePath);
      const command = commandModule.default;
      
      if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          commands.push(command.data.toJSON());
      }
  }

  // Register Slash Commands ke Discord API
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  try {
      console.log(`Started refreshing ${commands.length} application (/) commands.`);
      
      // Register global commands
      await rest.put(
          Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
          { body: commands },
      );

      console.log(`✅ Successfully reloaded application (/) commands.`);
  } catch (error) {
      console.error(error);
  }

  // Event saat Bot Online
  client.once(Events.ClientReady, c => {
      console.log(`🎧 DJ ${c.user.tag} is ready to serve!`);
  });

  // Event saat ada Command masuk
  client.on(Events.InteractionCreate, async interaction => {
      if (!interaction.isChatInputCommand()) return;

      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      try {
          await command.execute(interaction);
      } catch (error) {
          console.error(error);
          if (interaction.replied || interaction.deferred) {
              await interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true });
          } else {
              await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
          }
      }
  });

  // Login
  await client.login(process.env.DISCORD_TOKEN);
  return client;
}

/**
* 2. FUNGSI AUTOPOST (YANG BARU)
* Mengirim embed dengan dukungan Image Buffer & Auto Comment
*/
export async function sendAutoPostEmbed({ client, comment, caption, imageUrl, imageBuffer, channelId }) {
try {
  const channel = await client.channels.fetch(channelId);
  if (!channel) {
      console.warn(`⚠️ Channel ${channelId} not found or bot has no access.`);
      return;
  }

  const embed = new EmbedBuilder()
    .setColor('Random')
    .setDescription(caption) 
    .setTimestamp();

  const payload = { embeds: [embed] };

  // Auto Comment (Engagement)
  if (comment) {
      payload.content = comment;
  }

  // Handle Gambar (Buffer vs URL)
  if (imageBuffer) {
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'card.png' });
    embed.setImage('attachment://card.png');
    payload.files = [attachment];
  } else {
    embed.setImage(imageUrl);
  }

  await channel.send(payload);

} catch (error) {
  console.error(`❌ Failed to send to Discord channel ${channelId}:`, error.message);
}
}

/**
* 3. UPDATE STATUS BOT
*/
export async function updateBotPresence(client, track) {
if (client.user) {
  client.user.setActivity(`${track.name} by ${track.artist}`, { type: ActivityType.Listening });
}
}