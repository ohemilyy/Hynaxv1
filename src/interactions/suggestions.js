const { SlashCommandBuilder } = require("@discordjs/builders");
const chalk = require("chalk");
const { MessageEmbed } = require("discord.js");
module.exports = {
    metadata: new SlashCommandBuilder()
        .setName("suggestion")
        .setDescription("Create and edit suggestions")
        .addSubcommand(o => 
            o.setName("create")
                .setDescription("Create a suggestion")
                .addStringOption(o =>
                    o.setName("suggestion")
                        .setDescription("The content of the suggestion")
                        .setRequired(true)))
        .addSubcommand(o => 
            o.setName("edit")
                .setDescription("Edit a suggestion")
                .addIntegerOption(o =>
                    o.setName("id")
                        .setDescription("The ID of the suggestion to edit")
                        .setRequired(true))
                .addStringOption(o =>
                    o.setName("suggestion")
                        .setDescription("The content of the suggestion")
                        .setRequired(true)))
        .addSubcommand(o =>
            o.setName("respond")
                .setDescription("Respond to a suggestion")
                .addIntegerOption(o =>
                    o.setName("id")
                        .setDescription("The ID of the suggestion to respond to")
                        .setRequired(true))
                .addStringOption(o => 
                    o.setName("verdict")
                        .setDescription("The verdict")
                        .setRequired(true)
                        .addChoice("Accept", "accept")
                        .addChoice("Reject", "deny")
                        .addChoice("Consider", "consider"))
                .addStringOption(o =>
                    o.setName("response")
                        .setDescription("Explain reasoning as to why")
                        .setRequired(true))),
    run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const guildID = await client.db.get("roles.public");
        const guild = await client.guilds.fetch(guildID);
        const suggestionsChannel = await guild.channels.cache.get(client.config.discord.channels.suggestions.channel);

        async function createSuggestion() {
            let index = await client.db.get("suggestions.index");
            if (!index) {
                await client.db.set("suggestions.index", 1);
                index = 1;
            };

            const suggestion = interaction.options.getString("suggestion");
            let skeleton = {
                id: index,
                content: suggestion,
                author: {
                    id: interaction.user.id,
                    name: interaction.user.tag
                }, 
                response: {
                    authorID: null,
                    verdict: null,
                    content: null
                },
                messageID: null
            };
            
            await suggestionsChannel.send({ embeds: [new MessageEmbed().setTitle(`Suggestion #${index}`).setDescription(suggestion).setColor(`#FF55FF`).setAuthor({ name: `Created by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ size: 4096, dynamic: true }) }).setFooter({ text: "Suggestions", iconURL: client.user.displayAvatarURL({ size: 4096, dynamic: true }) }).setTimestamp()] }).then(m => {
                m.react("✅");
                m.react("❌");
                skeleton.messageID = m.id;
            });

            await client.db.set(`suggestions.${index}`, skeleton);
            await client.db.set("suggestions.index", index + 1);   
            
            interaction.editReply("Your suggestion was created successfully!");
        };

        async function editSuggestion() {
            const suggestionID = interaction.options.getInteger("id");
            const suggestion = await client.db.get(`suggestions.${suggestionID}`);
            if (!suggestion) {
                interaction.editReply("That suggestion does not exist!");
                return;
            };

            if (suggestion.author.id !== interaction.user.id) {
                interaction.editReply("You cannot edit this suggestion!");
                return;
            };
            
            if (suggestion.response.verdict !== null) {
                interaction.editReply("That suggestion has already been responded to. You may not edit this suggestion.");
                return;
            }

            const newSuggestion = interaction.options.getString("suggestion");
            suggestion.content = newSuggestion;
            await client.db.set(`suggestions.${suggestionID}`, suggestion);

            const message = await suggestionsChannel.messages.fetch(suggestion.messageID);
            await message.edit({ embeds: [new MessageEmbed().setTitle(`Suggestion #${suggestionID}`).setDescription(newSuggestion).setColor("WHITE").setAuthor({ name: `Edited by ${interaction.user.tag}`, iconURL: message.embeds[0].author.iconURL }).setFooter({ text: "Suggestions", iconURL: client.user.displayAvatarURL({ size: 4096, dynamic: true }) }).setTimestamp()] }).catch(f => {
                console.log(`${chalk.red("ERROR")} || Suggestion ${index}'s Discord message does not exist, aborting edit..`);
            });

            interaction.editReply("Your suggestion was edited successfully.");
        };

        async function respondToSuggestion() {
            const suggestionID = interaction.options.getInteger("id");
            const suggestion = await client.db.get(`suggestions.${suggestionID}`);
            if (!suggestion) {
                interaction.editReply("That suggestion does not exist!");
                return;
            };

            if (!interaction.member.roles.cache.has(client.config.discord.roles.public.suggestions)) {
                return interaction.editReply("You must have the appropriate role in order to respond to suggestions!");
            };

            if (suggestion.response.verdict !== null) {
                interaction.editReply("That suggestion has already been responded to!");
                return;
            };

            const verdict = interaction.options.getString("verdict");
            const response = interaction.options.getString("response");
            suggestion.response.authorID = interaction.user.id;
            suggestion.response.verdict = verdict;
            suggestion.response.content = response;
            await client.db.set(`suggestions.${suggestionID}`, suggestion);

            let verdictFriendly = {};
            if (verdict === "accept") {
                verdictFriendly.message = "Accepted";
                verdictFriendly.colour = "GREEN";
            } else if (verdict === "deny") {
                verdictFriendly.message = "Rejected";
                verdictFriendly.colour = "RED";
            } else if (verdict === "consider") {
                verdictFriendly.message = "Considered";
                verdictFriendly.colour = "#CD0000";
            };

            const message = await suggestionsChannel.messages.fetch(suggestion.messageID);
            await message.edit({ embeds: [new MessageEmbed().setTitle(`Suggestion #${suggestionID} ${verdictFriendly.message.toLowerCase()}`).setDescription(suggestion.content).setColor(verdictFriendly.colour).setAuthor({ name: `${suggestion.author.name}`, iconURL: message.embeds[0].author.iconURL }).setFooter({ text: "Suggestions", iconURL: client.user.displayAvatarURL({ size: 4096, dynamic: true }) }).setTimestamp().addField(`Responded to by ${interaction.user.tag}`, response)] });

            interaction.editReply("The suggestion was successfully responded to.");
        };

        const operation = interaction.options.getSubcommand();

        switch (operation) {
            case "create":
                await createSuggestion();
                break;
            
            case "edit":
                await editSuggestion();
                break;
            
            case "respond":
                await respondToSuggestion();
                break;
            
            default:
                await interaction.editReply("HOW THE FUCK DID YOU GET HERE?");
                break;
        };
    }
};