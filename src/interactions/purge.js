const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");

let RoleDefinitions = {
    TrialMod: "892852207194628196"
};

module.exports = {
metadata: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete messages in bulk")
    .addIntegerOption(option => option.setName("amount").setDescription("Amount of messages to purge").setMinValue(1).setMaxValue(100).setRequired(true)),
run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: false });

        if (interaction.member.roles.highest.comparePositionTo(interaction.guild.roles.cache.get(RoleDefinitions.TrialMod)) <=! 0) return interaction.editReply({ content: "You do not have permission to use this command." });

        let amount = interaction.options.getInteger("amount");

        await interaction.channel.bulkDelete(amount, { filterOld: true }).then(async m => {
            await interaction.channel.send("👍");
        }).catch(e => {
            interaction.editReply({ content: "Could not purge any messages. (Were the messasges sent 14 days ago or longer?)" });
        });
    }
};

