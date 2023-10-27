const { SlashCommandBuilder } = require("@discordjs/builders");
const chalk = require("chalk");

module.exports = {
    metadata: new SlashCommandBuilder()
        .setName("srolemanager")
        .setDescription("[PROCTOR ONLY] Manage Hynax's server \"roles\".")
        .addStringOption(o =>
            o.setName("operation")
                .setDescription("Select an operation")
                .setRequired(true)
                .addChoice("Set", "set"))
        .addStringOption(o =>
            o.setName("guild")
                .setDescription("The ID of the guild to add or remove from the list of authorized guilds")
                .setRequired(true))
        .addStringOption(o =>
            o.setName("role")
                .setDescription("The role that the server should be assigned to.")
                .setRequired(true)
                .addChoice("Staff server", "staff")
                .addChoice("Public-facing server", "public")),
    run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: false });
        if (!client.config.proctors.includes(interaction.member.id)) return interaction.editReply("You are not a proctor!");
        const operation = interaction.options.getString("operation");
        const guild = interaction.options.getString("guild");
        const role = interaction.options.getString("role");

        if (operation === "set") {
            await client.db.set(`roles.${role}`, guild);
            console.log(chalk.blue(`${chalk.bold("SERVER ROLES")}`) + ` || Server ID ${chalk.bold(guild)} was assigned to ${chalk.bold(role)}`);
            return interaction.editReply(`The guild ID \`${guild}\` was assigned to the \`${role}\` role.`);
        };
    }
};