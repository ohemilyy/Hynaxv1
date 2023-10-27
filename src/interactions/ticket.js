const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const fetchAllMessages = require("discord-fetch-all").messages;
const pgg = require("paste.gg");
const emoji = require("node-emoji");
const haste = new pgg();

const chalk = require("chalk");
module.exports = {
    metadata: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Manage ticket requests")
        .addSubcommand(o => 
            o.setName("close")
                .setDescription("Close this ticket"))
        .addSubcommand(o =>
            o.setName("adduser")
                .setDescription("Add a user to this ticket")
                .addUserOption(o => 
                    o.setName("user")
                        .setDescription("The user to add to this ticket")
                        .setRequired(true)
                ))
        .addSubcommand(o =>
            o.setName("removeuser")
                .setDescription("Remove a user to this ticket")
                .addUserOption(o =>
                    o.setName("user")
                        .setDescription("The user to remove from this ticket")
                        .setRequired(true)
                ))
        .addSubcommand(o =>
            o.setName("generatemessage")
                .setDescription("[PROCTORS ONLY] Generate a create ticket message in this channel."))
        ,
    run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });
        
        const guildID = await client.db.get("roles.public");
        const guild = await client.guilds.fetch(guildID);

        async function closeTicket() {
            const ticketID = interaction.channel.name.split("-")[2];
            if (!ticketID) {
                await interaction.editReply("This is not a ticket channel. If this uses the old format, please contact a proctor.");
                return;
            };

            const ticket = await client.db.get(`tickets.${ticketID}`);
            if (!ticket) {
                await interaction.editReply("This ticket is not in the database. Please manually delete this channel.");
                return;
            };

            await interaction.channel.send(`${interaction.user} has closed this ticket. Please allow up to 10 minutes for the ticket to be archived and closed.`);
            await interaction.editReply("Your request to close the ticket was submitted. Please allow up to 10 minutes for the ticket to be closed, as the bot is currently transcripting this channel.");

            // Prevent users from writing in the channel
            
            const transcriptChannel = await guild.channels.fetch(client.config.discord.channels.tickets.transcripts);

            const allMessages = await fetchAllMessages(interaction.channel, {
                reverseArray: true
            });
            let transcript = "";

            allMessages.forEach(f => {
                transcript = transcript + `${f.author.tag} (${f.author.id}) (${f.createdAt.toUTCString()}) || ${f.content}\n`;
            });

            let hasteLink;
            let hasteDelKey = "n/a";

            await client.db.set(`tickets.${ticketID}.transcript`, transcript);
            await haste.post({
                name: `${interaction.channel.id} || Hynax Transcripts`,
                visibility: "unlisted",
                files: [
                    {
                        name: `transcript.txt`,
                        content: {
                            format: "text",
                            value: transcript
                        }
                    }
                ]
            }).then(f => { hasteLink = f.result.url; hasteDelKey = f.result.deletion_key; }).catch(e => { hasteLink = `[error fetching hastebin API, transcript is stored in tickets.${ticketID}.transcript]` });


            const closeTicketButtonRow = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setLabel("Delete Ticket")
                        .setStyle("PRIMARY")
                        .setCustomId("ticketDelete")
                        .setEmoji(emoji.get("wastebasket"))
                );

            const closedEmbed = new MessageEmbed().setTitle("Ticket Closed").setDescription(`This ticket has been **closed** by <@${interaction.user.id}>.\n\nAs per privacy-related laws and guidelines like the GDPR, **you are entitled to view the information that we store.** Thus, this ticket has been uploaded to paste.gg for you and staff members to reference in the future [at this link](${hasteLink}).\n\n**If you would like to delete this transcript, the deletion key for this paste is \`${hasteDelKey}\`. Please save and delete the transcript if this ticket contains sensitive information.**\n\nIf you have any questions, please contact a staff member.\n\n(When you're ready to delete this channel, click \`Delete Ticket\`.)`).setColor("GREEN").setTimestamp();
            const transcriptEmbed = new MessageEmbed().setTitle(`Transcript: ${ticketID}`).setDescription(`Ticket #${ticketID} was closed by **${interaction.user.tag}**.\n\nA transcript is available [here](${hasteLink}).\n\n**Delete Key: \`${hasteDelKey}\`**`).setColor("GREEN").setTimestamp();

            await interaction.channel.send({ embeds: [closedEmbed], components: [closeTicketButtonRow] });
            await transcriptChannel.send({ embeds: [transcriptEmbed] });

            ticket.status = "closed";
            ticket.transcriptLink = hasteLink;
            ticket.transcriptDelKey = hasteDelKey;

            await client.db.set(`tickets.${ticketID}`, ticket);
        };

        async function addUser() {
            await interaction.editReply("This functionality is coming soon.");
        };

        async function removeUser() {
            await interaction.editReply("This functionality is coming soon.");
        };

        async function generateMessage() {
            if (interaction.guildRole !== "public") return interaction.editReply("This functionality is only available in the public server");
            if (!client.config.proctors.includes(interaction.member.id)) return interaction.editReply("You are not a proctor!");

            const embed = new MessageEmbed().setTimestamp().setColor(`#FF55FF`).setTitle("Create a support ticket").setDescription("**Tickets**\nTo create a ticket, react with 🎟️.\n\n⚠️ Tickets will be closed if you do not respond within 2 hours whilst pinged. If you abuse or open unnecessary tickets after being warned not to, you may be permanently banned from opening another ticket.").setFooter({ text: "Tickets", iconURL: client.user.displayAvatarURL({ size: 4096, dynamic: true }) });
            const button = new MessageActionRow().addComponents(
                new MessageButton().setCustomId("createTicket").setLabel("Open a ticket").setStyle("PRIMARY").setEmoji("🎟️")
            )
            
            await interaction.channel.send({ embeds: [embed], components: [button] });

            interaction.editReply("Successfully generated a ticket creation message.")
        };

        const operation = interaction.options.getSubcommand();
        switch (operation) {
            case "close":
                closeTicket();
                break;

            case "adduser":
                addUser();
                break;
            
            case "removeuser":
                removeUser();
                break;

            case "generatemessage":
                generateMessage();
                break;
        };
    }
};