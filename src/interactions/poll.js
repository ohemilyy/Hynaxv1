
const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");

module.exports = {
metadata: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a poll in this channel")
    .addStringOption(option => option.setName("prompt").setDescription("Enter your poll's question").setRequired(true))
    .addStringOption(option => option.setName("opt1").setDescription("Enter the first answer option").setRequired(true))
    .addStringOption(option => option.setName("opt2").setDescription("Enter the second answer option").setRequired(true))
    .addStringOption(option => option.setName("opt3").setDescription("Enter the third answer option").setRequired(false))
    .addStringOption(option => option.setName("opt4").setDescription("Enter the fourth answer option").setRequired(false)),
run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: false });

        let title = interaction.options.getString("prompt");

        if (!interaction.member.roles.cache.has(client.config.discord.roles.public.staff)) return interaction.editReply("Only staff members are permitted to create polls.");

        if (title.length > 60) {
            await interaction.editReply("Your poll question is too long! Please make it shorter.");
            return;
        };

        let str = `:one: \`${interaction.options.getString("opt1")}\``;
        str = str + `\n\n:two: \`${interaction.options.getString("opt2")}\``;

        let otherReactions = {
            three: false,
            four: false
        }

        if (interaction.options.getString("opt3") !== "" && interaction.options.getString("opt3") !== null && interaction.options.getString("opt3") !== undefined) {
            str = str + `\n\n:three: \`${interaction.options.getString("opt3")}\``;
            otherReactions.three = true;
        } if (interaction.options.getString("opt4") !== "" && interaction.options.getString("opt4") !== null && interaction.options.getString("opt4") !== undefined) {
            str = str + `\n\n:four: \`${interaction.options.getString("opt4")}\``;
            otherReactions.four = true;
        }

        const embed = new MessageEmbed()
            .setTitle(`Poll: ${title} 📣`)
            .setAuthor({ name: `Posted by ${interaction.user.username}`, iconURL: interaction.user.avatarURL({ size: 4096, dynamic: true }) })
            .setColor(`#FF55FF`)
            .setTimestamp()
            .setDescription(str)
            .setFooter({ text: `Poll`, iconURL: client.user.avatarURL({ size: 4096, dynamic: true }) });

        interaction.editReply({ embeds: [embed] });

        const interactionMsg = await interaction.fetchReply();
        await interactionMsg.react("1️⃣");
        await interactionMsg.react("2️⃣");
        if (otherReactions.three) await interactionMsg.react("3️⃣");
        if (otherReactions.four) await interactionMsg.react("4️⃣");
    }
};

