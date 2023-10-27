const { SlashCommandBuilder } = require("@discordjs/builders");
const chalk = require("chalk");
module.exports = {
    metadata: new SlashCommandBuilder()
        .setName("regrant")
        .setDescription("[PROCTOR ONLY] Recreate fishSDK internal grants"),
    run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: false });
        if (!client.config.proctors.includes(interaction.member.id)) return interaction.editReply("You are not a proctor!");
        if (interaction.member.id !== "181944866987704320") return interaction.editReply("You do not have grant `exports.fishSDK.permissionGrants.leadProctor`.");

        const member = await interaction.guild.members.fetch("181944866987704320");
        await member.roles.add("949064454497263677");

        return interaction.editReply(`Grant successfully applied.`);
    }
};