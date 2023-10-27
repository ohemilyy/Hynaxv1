
const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const chalk = require("chalk");

module.exports = {
metadata: new SlashCommandBuilder()
    .setName("announcement")
    .setDescription("Publish an embed containing an important message to this channel")
    .addStringOption(option => option.setName("message").setDescription("Enter your announcement here").setRequired(true)),
run: async (client, interaction) => {
      await interaction.deferReply({ ephemeral: false });
      let msg = interaction.options.getString("message");

      if (interaction.member.roles.highest.comparePositionTo(client.config.discord.roles.public.admin) < 0) return interaction.editReply("Only staff members are permitted to make announcements.");

      if (msg.length > 2038) {
        await interaction.editReply("Your announcement is too long. Please make it shorter.");
        return;
      };
      
      const embed = new MessageEmbed()
        .setTitle(`New Announcement 📣`)
        .setAuthor({ name: `Posted by ${interaction.user.username}`, iconURL: interaction.user.avatarURL({ size: 4096, dynamic: true }) })
        .setColor(`#FF55FF`)
        .setTimestamp()
        .setDescription(msg.split("\\n").join("\n").split("<nl>").join("\n"))
        .setFooter({ text: `Announcement`, iconURL: client.user.avatarURL({ size: 4096, dynamic: true }) });

      interaction.editReply({ embeds: [embed] });
      console.log(chalk.blue(`${chalk.bold("ANNOUNCEMENT")}`) + ` || ${chalk.bold(interaction.user.tag)} made an announcement`);
    }
};

