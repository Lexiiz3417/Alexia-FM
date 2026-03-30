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
import { fileURLToPath, pathToFileURL } from 'url'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 1. FUNGSI UTAMA: MENYALAKAN BOT (STARTUP)
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
      const fileUrl = pathToFileURL(filePath).href; 
      const commandModule = await import(fileUrl);
      
      const command = commandModule.default;
      
      if (command && 'data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          commands.push(command.data.toJSON());
      }
  }

  // Register Slash Commands
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  try {
      console.log(`Started refreshing ${commands.length} application (/) commands.`);
      await rest.put(
          Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
          { body: commands },
      );
      console.log(`✅ Successfully reloaded application (/) commands.`);
  } catch (error) {
      console.error(error);
  }

  // 🎧 Event saat Bot Online (DENGAN INITIAL STATUS)
  client.once(Events.ClientReady, c => {
      console.log(`🎧 DJ ${c.user.tag} is ready to serve!`);
      
      // Pasang status awal biar gak bengong pas baru login
      c.user.setPresence({
        activities: [{ 
            name: 'Alexia FM Radio 📻', 
            type: ActivityType.Listening 
        }],
        status: 'online',
      });
  });

  // Event Interaction Create
  client.on(Events.InteractionCreate, async interaction => {
      if (!interaction.isChatInputCommand()) return;

      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      try {
          await command.execute(interaction);
      } catch (error) {
          console.error(error);
          if (interaction.replied || interaction.deferred) {
              await interaction.followUp({ content: 'There was an error executing this command!', flags: ['Ephemeral'] });
          } else {
              await interaction.reply({ content: 'There was an error executing this command!', flags: ['Ephemeral'] });
          }
      }
  });

  await client.login(process.env.DISCORD_TOKEN);
  return client;
}

/**
 * 2. FUNGSI AUTOPOST DISCORD
 */
export async function sendAutoPostEmbed({ client, comment, caption, imageUrl, imageBuffer, channelId }) {
  try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) return console.warn(`⚠️ Channel ${channelId} not found.`);

      const embed = new EmbedBuilder()
        .setColor('Random')
        .setDescription(caption) 
        .setTimestamp();

      const payload = { embeds: [embed] };
      if (comment) payload.content = comment;

      if (imageBuffer) {
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'card.png' });
        embed.setImage('attachment://card.png');
        payload.files = [attachment];
      } else {
        embed.setImage(imageUrl);
      }

      await channel.send(payload);

  } catch (error) {
      console.error(`❌ Discord Post Error:`, error.message);
  }
}

/**
 * 3. UPDATE STATUS BOT (REVISI: Listening to...)
 */
export async function updateBotPresence(client, track) {
  if (!client.user || !track) return;

  try {
    const statusText = `${track.name} by ${track.artist}`;
    
    // Gunakan setPresence agar status "Listening to" lebih persisten
    client.user.setPresence({
      activities: [{ 
        name: statusText, 
        type: ActivityType.Listening 
      }],
      status: 'online',
    });

    console.log(`🎧 Presence Updated: Listening to ${statusText}`);
  } catch (error) {
    console.error("❌ Failed to update presence:", error.message);
  }
}