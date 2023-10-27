const { SlashCommandBuilder } = require("@discordjs/builders");
const chalk = require("chalk");
module.exports = {
    metadata: new SlashCommandBuilder()
        .setName("invitemanager")
        .setDescription("[PROCTOR ONLY] Manage Hynax's authorised servers.")
        .addStringOption(o =>
            o.setName("operation")
                .setDescription("Select an operation")
                .setRequired(true)
                .addChoice("Add", "add")
                .addChoice("Remove", "remove"))
        .addStringOption(o =>
            o.setName("guild")
                .setDescription("The ID of the guild to add or remove from the list of authorized guilds")
                .setRequired(true)),
    run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: false });
        if (!client.config.proctors.includes(interaction.member.id)) return interaction.editReply("You are not a proctor!");
        const operation = interaction.options.getString("operation");
        const guild = interaction.options.getString("guild");

        if (operation === "add") {
            await client.db.set(`${guild}.authorized`, true);
            console.log(chalk.blue(`${chalk.bold("SERVER ACCESS")}`) + ` || Server ID ${chalk.bold(guild)} was ${chalk.green("added")}`);
            return interaction.editReply(`The guild ID \`${guild}\` was added to the authorized database.`);
        } if (operation === "remove") {
            await client.db.delete(`${guild}.authorized`);
            console.log(chalk.blue(`${chalk.bold("SERVER ACCESS")}`) + ` || Server ID ${chalk.bold(guild)} was ${chalk.red("removed")}`);
            return interaction.editReply(`The guild ID \`${guild}\` was removed from the authorized database.`);
        };
    }
};