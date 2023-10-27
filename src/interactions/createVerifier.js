const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");

module.exports = {
    metadata: new SlashCommandBuilder()
        .setName("verifiercreate")
        .setDescription("[PROCTOR ONLY] Create a role verifier"),
    run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });
        if (!client.config.proctors.includes(interaction.member.id)) return interaction.editReply("You are not a proctor!");

        const embed = new MessageEmbed()
            .setTitle(`Hello there! Welcome to our Discord! 👋`)
            .setAuthor({ name: `Verifier`, iconURL: client.user.avatarURL({ size: 4096, dynamic: true }) })
            .setTimestamp()
            .setColor(`#FF55FF`)
            .setFooter({ text: `Verifier`, iconURL: client.user.avatarURL({ size: 4096, dynamic: true }) })
            .addField("Verification", "Click on the button below and verification will start in this channel.")
            .addField("Is that all?", "Yes! All you have to do is click the button below and you will have full access to our Discord after following the steps prompted.");

        const ButtonRow = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setLabel("Verify")
                    .setEmoji("✅")
                    .setStyle("PRIMARY")
                    .setCustomId("verify")
            );
        
        await interaction.channel.send({ embeds: [embed], components: [ButtonRow] });
        interaction.editReply("The verifier message was sent successfully.");
    }
};