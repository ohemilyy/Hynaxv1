const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed, MessageActionRow, MessageButton} = require("discord.js");

module.exports = {
    metadata: new SlashCommandBuilder()
        .setName("informationpanel")
        .setDescription("[PROCTOR ONLY] Deploy the information panel"),
        run: async (client, interaction) => {
            await interaction.deferReply({ ephemeral: true });
            if (!client.config.proctors.includes(interaction.member.id)) return interaction.editReply("You are not a proctor!");
    
    const embed = new MessageEmbed()
        .setTitle('Welcome to the official PhantomHQ Discord Server! 👋')
        // .setAuthor({ name: `Verifier`, iconURL: client.user.avatarURL({ size: 4096, dynamic: true }) })
        .setTimestamp()
        .setColor(`#FF55FF`)
        .setFooter({ text: `Information`, iconURL: client.user.avatarURL({ size: 4096, dynamic: true }) })
        .setDescription(`
        **PhantomHQ** is a competitive KitPvP and UHC gamemode server. Featuring some unique twists to KitPvP and UHC.
        
        Supported Versions:
        1.7.x - 1.12.x
        
        We recommend 1.7 or 1.8 for the best pvp experience
        
        We hope you have an amazing time at PhantomHQ! <3
        `)

        const ButtonRow = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setLabel("Server IP")
                .setEmoji("📡")
                .setStyle("PRIMARY")
                .setCustomId("informationPanelServerIP"),
            new MessageButton()
                .setLabel("Guidelines/Rules")
                .setEmoji("📖")
                .setStyle("DANGER")
                .setCustomId("informationPanelRules"),
            new MessageButton()
                .setLabel("Social Media")
                .setEmoji("📱")
                .setStyle("PRIMARY")
                .setCustomId("informationPanelSocialMedia"),
            new MessageButton()
                .setLabel("Applications & Appeals")
                .setEmoji("📝")
                .setStyle("SUCCESS")
                .setCustomId("informationPanelApplications"),
            new MessageButton()
                .setLabel("Frequently Asked Questions")
                .setEmoji("💬")
                .setStyle("PRIMARY")
                .setCustomId("informationPanelFAQ"),

        );

        
        
    
    await interaction.channel.send({ embeds: [embed], components: [ButtonRow] });
    interaction.editReply("The info panel was deployed.");

    }
      
};