/**
 * @project Hynax
 *
 * @date March 6th, 2022
 * @author ItzBunniYT
 */

const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed, MessageActionRow, MessageButton} = require("discord.js");

module.exports = {
    metadata: new SlashCommandBuilder()
        .setName("rewardspanel")
        .setDescription("[PROCTOR ONLY] Deploy the rewards panel"),
        run: async (client, interaction) => {
            await interaction.deferReply({ ephemeral: true });
            if (!client.config.proctors.includes(interaction.member.id)) return interaction.editReply("You are not authorized to use this command!");
    
    const embed = new MessageEmbed()
        .setTitle('Looking for some sweet rewards? :tada:')
        .setTimestamp()
        .setColor(`#FF55FF`)
        .setFooter({ text: `Rewards`, iconURL: client.user.avatarURL({ size: 4096, dynamic: true }) })
        .setDescription(`
            Hey there! We are currently working on a rewards system for PhantomHQ.

            Looking to get rewarded for easy tasks? Click the button below to see how you can get rewards!

            If you have any questions, feel free to ask a staff member.

        `)

        const ButtonRow = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setLabel("Invite Rewards")
                .setEmoji("💚")
                .setStyle("PRIMARY")
                .setCustomId("inviteRewards"),
            new MessageButton()
                .setLabel("Boosting Rewards")
                .setEmoji("🧡")
                .setStyle("DANGER")
                .setCustomId("boostRewards"),
        );

        
        
    
    await interaction.channel.send({ embeds: [embed], components: [ButtonRow] });
    interaction.editReply("The rewards panel was deployed.");

    }
      
};