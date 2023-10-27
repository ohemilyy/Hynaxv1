/**
 * @project Hynax
 *
 * @date March 6th, 2022
 * @author ItzBunniYT
 */
/* @todo: finish reaction roles
*/
 const { SlashCommandBuilder } = require("@discordjs/builders");
 const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");

    module.exports = {
        metadata: new SlashCommandBuilder()
        .setName("reactionspanel")
        .setDescription("[PROCTOR ONLY] Deploy the information panel"),
        run: async (client, interaction) => {
            await interaction.deferReply({ ephemeral: true });
            if (!client.config.proctors.includes(interaction.member.id)) return interaction.editReply("You are not authorized to use this command!");

    const embed = new MessageEmbed()
    .setTitle('Role Selection')
    // .setAuthor({ name: `Verifier`, iconURL: client.user.avatarURL({ size: 4096, dynamic: true }) })
    .setTimestamp()
    .setColor(`#FF55FF`)
    .setFooter({ text: `Roles`, iconURL: client.user.avatarURL({ size: 4096, dynamic: true }) })
    .setDescription(`
    Pick a role to your liking. We have announcements, and whatever else.
    You're free to suggest roles to add, we'll hear you!
    `)

    const RoleMenu = new MessageActionRow()
    .addComponents(
				new MessageSelectMenu()
					.setCustomId('select')
					.setPlaceholder('Nothing selected')
					.setMinValues(2)
					.setMaxValues(3)
					.addOptions([
						{
							label: 'Select me',
							description: 'This is a description',
							value: 'first_option',
						},
						{
							label: 'You can select me too',
							description: 'This is also a description',
							value: 'second_option',
						},
						{
							label: 'I am also an option',
							description: 'This is a description as well',
							value: 'third_option',
						},
					]),
			);

    await interaction.channel.send({ embeds: [embed], components: [RoleMenu] });
    interaction.editReply("The reaction panel was deployed.");

        }
    };