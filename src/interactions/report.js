const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");

// report user 

module.exports = {
    metadata: new SlashCommandBuilder()
    .setName("report")
    .setDescription("Report a user to the staff team")
    .addUserOption(option => option.setName("user").setDescription("The user you want to report").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("The reason for the report").setRequired(true))
    // evidence
    .addStringOption(option => option.setName("evidence").setDescription("The evidence for the report").setRequired(false)),
    run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });
        if (!client.config.proctors.includes(interaction.member.id)) return interaction.editReply("You are not authorized to use this command!");

        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");
        const evidence = interaction.options.getString("evidence");





        const embed = new MessageEmbed()
        .setTitle("**New Report**")
        .setAuthor({ name: `Reported by ${interaction.member.user.tag}`, iconURL: interaction.member.user.avatarURL({ size: 4096, dynamic: true }) })
        .setTimestamp()
        .setColor(`#FF55FF`)
        .setFooter({ text: `Reported user: ${user.tag}`, iconURL: user.avatarURL({ size: 4096, dynamic: true }) })
        .setDescription(`
        **Reported user:** ${user}
        **Reason:** ${reason}
        **Evidence:** ${evidence}
        `)




            
        // await interaction.channel.send({ embeds: [embed], components: [report] });

        // send to this channel id 1033883205608144936
        const channel = client.channels.cache.get("1033883205608144936");
        channel.send({ embeds: [embed] });
        // ping staff in the channel
        channel.send(`<@1033883162226475008>`);
        // await client.guild.channels.cache.get("1033883181302161448").send({ embeds: [embed], components: [report] });
        interaction.editReply("The report was sent to the staff team.");
    }
}
