const { SlashCommandBuilder } = require("@discordjs/builders");
const chalk = require("chalk");
const { MessageEmbed } = require("discord.js");

let RoleDefinitions = {
    TrialMod: "892852207194628196",
    Mod: "870495763124346880"
};

module.exports = {
    metadata: new SlashCommandBuilder()
        .setName("punish")
        .setDescription("Issue a specific punishment to a user")
        .addSubcommand(o => 
            o.setName("warn")
                .setDescription("Warn a user")
                .addUserOption(o =>
                    o.setName("user")
                        .setDescription("Provide a user to warn")
                        .setRequired(true))
                .addStringOption(o =>
                    o.setName("reason")
                        .setDescription("Provide a reason as to why this punishment has been issued")
                        .setRequired(true)))
        .addSubcommand(o => 
            o.setName("kick")
                .setDescription("Remove a user from the server with chance of return")
                .addUserOption(o =>
                    o.setName("user")
                        .setDescription("Provide a user to kick")
                        .setRequired(true))
                .addStringOption(o =>
                    o.setName("reason")
                        .setDescription("Provide a reason as to why this punishment has been issued")
                        .setRequired(true)))
        .addSubcommand(o =>
            o.setName("ban")
                .setDescription("Remove a user from the server with no chance of return")
                .addUserOption(o =>
                    o.setName("user")
                        .setDescription("Provide a user to ban")
                        .setRequired(true))
                    .addStringOption(o =>
                        o.setName("reason")
                            .setDescription("Provide a reason as to why this punishment has been issued")
                            .setRequired(true)))
        .addSubcommand(o =>
            o.setName("timeout")
                .setDescription("Temporarily block a user from speaking in the server")
                .addUserOption(o =>
                    o.setName("user")
                        .setDescription("Provide a user to timeout")
                        .setRequired(true))
                .addIntegerOption(o =>
                    o.setName("length")
                        .setDescription("Provide a length of time to timeout the user")
                        .setRequired(true)
                        .addChoice("Remove", 0)
                        .addChoice("1 minute", 1)
                        .addChoice("5 minutes", 5)
                        .addChoice("10 minutes", 10)
                        .addChoice("30 minutes", 30)
                        .addChoice("1 hour", 60)
                        .addChoice("2 hours", 120)
                        .addChoice("6 hours", 360)
                        .addChoice("12 hours", 720)
                        .addChoice("1 day (24 hours)", 1440)
                        .addChoice("2 days (48 hours)", 2880)
                        .addChoice("3 days (72 hours)", 4320)
                        .addChoice("1 week (7 days)", 10080)
                        .addChoice("2 weeks (14 days)", 20160)
                        .addChoice("1 month (25 days)", 36000))
                .addStringOption(o =>
                    o.setName("reason")
                        .setDescription("Provide a reason as to why this punishment has been issued")
                        .setRequired(true))),
    run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        if (interaction.guildRole === "staff") return interaction.editReply("public only");

        const guildID = await client.db.get(`roles.${client.config.discord.channels.logs.inStaffServer ? "staff" : "public"}`);
        const guild = await client.guilds.fetch(guildID);
        const logsChannel = await guild.channels.cache.get(client.config.discord.channels.logs.channel);
        let userRole = "";

        if (interaction.member.roles.highest.comparePositionTo(guild.roles.cache.get(RoleDefinitions.TrialMod)) >= 0) {
            userRole = "trial";
        } if (interaction.member.roles.highest.comparePositionTo(guild.roles.cache.get(RoleDefinitions.Mod)) >= 0) {
            userRole = "mod";
        } if (interaction.member.roles.highest.comparePositionTo(guild.roles.cache.get(RoleDefinitions.TrialMod)) < 0) {
            userRole = "user";
            return interaction.editReply(":x: You do not have permission to use the Punishment suite. If you believe this is an error please contact a staff member.");
        };

        const operation = interaction.options.getSubcommand();

        async function warn() {
            const user = interaction.options.getUser("user");
            const reason = interaction.options.getString("reason");

            let dbModel = await client.db.get(`punishments.${user.id}`);
            if (!dbModel) {
                dbModel = {
                    infractionCount: 0,
                    infractions: []
                };
            };

            dbModel.infractionCount++;
            dbModel.infractions[dbModel.infractionCount] = {
                type: "warning",
                id: dbModel.infractionCount,
                reason: reason,
                timestamp: new Date(),
                moderator: interaction.user.id
            };

            const embed = new MessageEmbed()
                .setTitle("🛡️ User Warned 🎫")
                .setDescription(`${user.tag} (${user.id}) was warned by ***${interaction.user.tag}***.`)
                .addField("Reason", "```md\n" + reason + "```", false)
                .addField("Punishment ID", `\`${user.tag.toUpperCase()}-${dbModel.infractionCount}\``, true)
                .addField("Moderator", `<@${interaction.user.id}>`, true)
                .setColor(`#FF55FF`)
                .setTimestamp()
                .setFooter({ text: `SEARCH: PUNISHMENT-${interaction.user.id}-${dbModel.infractionCount} || GROUP: PUNISHMENT-${interaction.user.id}` });;

                const userEmbed = new MessageEmbed()
                .setTitle("🛡️ You were warned")
                .setDescription(`You were warned by ***${interaction.user.tag}***.`)
                .addField("Reason", "```md\n" + reason + "```", false)
                .addField("Punishment ID", `\`${user.tag.toUpperCase()}-${dbModel.infractionCount}\``, true)
                .addField("Moderator", `<@${interaction.user.id}>`, true)
                .addField("Resolution", `If you would like to appeal this infraction, please contact Support.`, false)
                .setColor(`#FF55FF`)
                .setTimestamp();

            await logsChannel.send({ embeds: [embed] });

            await user.send({ embeds: [userEmbed] }).catch(f => {
                console.log(chalk.red(`[ERROR] Unable to send DM to user about case ${user.tag.toUpperCase()}-${dbModel.infractionCount}`));
            });

            await client.db.set(`punishments.${user.id}`, dbModel);

            await interaction.editReply(`:warn: ${user.tag} was warned successfully.`);
        };

        async function kick() {
            const user = interaction.options.getUser("user");
            const reason = interaction.options.getString("reason");

            let dbModel = await client.db.get(`punishments.${user.id}`);
            if (!dbModel) {
                dbModel = {
                    infractionCount: 0,
                    infractions: []
                };
            };

            dbModel.infractionCount++;
            dbModel.infractions[dbModel.infractionCount] = {
                type: "kick",
                id: dbModel.infractionCount,
                reason: reason,
                timestamp: new Date(),
                moderator: interaction.user.id
            };

            const embed = new MessageEmbed()
                .setTitle("🛡️ User kicked 📤")
                .setDescription(`${user.tag} (${user.id}) was kicked by ***${interaction.user.tag}***.`)
                .addField("Reason", "```md\n" + reason + "```", false)
                .addField("Punishment ID", `\`${user.tag.toUpperCase()}-${dbModel.infractionCount}\``, true)
                .addField("Moderator", `<@${interaction.user.id}>`, true)
                .setColor(`#FF55FF`)
                .setTimestamp()
                .setFooter({ text: `SEARCH: PUNISHMENT-${interaction.user.id}-${dbModel.infractionCount} || GROUP: PUNISHMENT-${interaction.user.id}` });;

            const userEmbed = new MessageEmbed()
                .setTitle("🛡️ You were kicked")
                .setDescription(`You were kicked by a staff member.`)
                .addField("Reason", "```md\n" + reason + "```", false)
                .addField("Punishment ID", `\`${user.tag.toUpperCase()}-${dbModel.infractionCount}\``, true)
                .addField("Resolution", `You may simply rejoin the server. If you would like to appeal this infraction, please contact Support.`, false)
                .setColor(`#FF55FF`)
                .setTimestamp();

            
            await user.send({ embeds: [userEmbed] }).catch(f => {
                console.log(chalk.red(`[ERROR] Unable to send DM to user about case ${user.tag.toUpperCase()}-${dbModel.infractionCount}`));
            });

            const guildUser = await interaction.guild.members.fetch(user.id);

            await guildUser.kick({ reason: reason }).catch(f => {
                console.log(chalk.red(`[ERROR] Unable to kick user ${user.tag} (Case ${user.tag.toUpperCase()}-${dbModel.infractionCount})`));
            });

            await logsChannel.send({ embeds: [embed] });

            await client.db.set(`punishments.${user.id}`, dbModel);

            await interaction.editReply(`${user.tag} was kicked successfully.`);
        };

        async function ban() {
            if (userRole !== "mod") return interaction.editReply("You do not have permission to ban members. Only moderators and higher can ban members.");

            const user = interaction.options.getUser("user");
            const reason = interaction.options.getString("reason");

            let dbModel = await client.db.get(`punishments.${user.id}`);
            if (!dbModel) {
                dbModel = {
                    infractionCount: 0,
                    infractions: []
                };
            };

            dbModel.infractionCount++;
            dbModel.infractions[dbModel.infractionCount] = {
                type: "ban",
                id: dbModel.infractionCount,
                reason: reason,
                timestamp: new Date(),
                moderator: interaction.user.id
            };

            const embed = new MessageEmbed()
                .setTitle("🛡️ User banned 🔨")
                .setDescription(`${user.tag} (${user.id}) was banned by ***${interaction.user.tag}***.`)
                .addField("Reason", "```md\n" + reason + "```", false)
                .addField("Punishment ID", `\`${user.tag.toUpperCase()}-${dbModel.infractionCount}\``, true)
                .addField("Moderator", `<@${interaction.user.id}>`, true)
                .setColor("RED")
                .setTimestamp()
                .setFooter({ text: `SEARCH: PUNISHMENT-${interaction.user.id}-${dbModel.infractionCount} || GROUP: PUNISHMENT-${interaction.user.id}` });;

            const userEmbed = new MessageEmbed()
                .setTitle("🛡️ You were banned")
                .setDescription(`You were banned by a staff member.`)
                .addField("Reason", "```md\n" + reason + "```", false)
                .addField("Punishment ID", `\`${user.tag.toUpperCase()}-${dbModel.infractionCount}\``, true)
                .addField("Resolution", `You are unable to rejoin the server until an appeal has been accepted. If you would like to appeal this infraction, please contact Support.`, false)
                .setColor("RED")
                .setTimestamp();


            await user.send({ embeds: [userEmbed] }).catch(f => {
                console.log(chalk.red(`[ERROR] Unable to send DM to user about case ${user.tag.toUpperCase()}-${dbModel.infractionCount}`));
            });

            const guildUser = await interaction.guild.members.fetch(user.id);

            await guildUser.ban({ reason: reason }).catch(f => {
                console.log(chalk.red(`[ERROR] Unable to ban user ${user.tag} (Case ${user.tag.toUpperCase()}-${dbModel.infractionCount})`));
                console.log(f);
            });

            await logsChannel.send({ embeds: [embed] });

            await client.db.set(`punishments.${user.id}`, dbModel);

            await interaction.editReply(`:hammer: ${user.tag} was banned successfully.`);
        };

        async function timeout() {
            const user = interaction.options.getUser("user");
            const reason = interaction.options.getString("reason");

            let dbModel = await client.db.get(`punishments.${user.id}`);
            if (!dbModel) {
                dbModel = {
                    infractionCount: 0,
                    infractions: []
                };
            };

            dbModel.infractionCount++;
            dbModel.infractions[dbModel.infractionCount] = {
                type: "timeout",
                id: dbModel.infractionCount,
                reason: reason,
                timestamp: new Date(),
                ends: new Date(Date.now() + (interaction.options.getInteger("length") * 60 * 1000)),
                moderator: interaction.user.id
            };

            const embed = new MessageEmbed()
                .setTitle("🛡️ User timed out 🤐")
                .setDescription(`<@${user.id}> / ${user.tag} (${user.id}) was muted by ***${interaction.user.tag}***.`)
                .addField("Reason", "```md\n" + reason + "```", false)
                .addField("Punishment ID", `\`${user.tag.toUpperCase()}-${dbModel.infractionCount}\``, true)
                .addField("Moderator", `<@${interaction.user.id}>`, true)
                .addField("Time out ends", `\`${new Date(Date.now() + (interaction.options.getInteger("length") * 60 * 1000)).toUTCString()}\``, true)
                .addField("Resolution", "To remove a timeout, right click the user in question (the user's mentionable is above) and click \`Remove Timeout From <User>\`.")
                .setColor("BLUE")
                .setTimestamp()
                .setFooter({ text: `SEARCH: PUNISHMENT-${interaction.user.id}-${dbModel.infractionCount} || GROUP: PUNISHMENT-${interaction.user.id}` });;

            const userEmbed = new MessageEmbed()
                .setTitle("🛡️ You were timed out")
                .setDescription(`You were muted by a staff member.`)
                .addField("Reason", "```md\n" + reason + "```", false)
                .addField("Punishment ID", `\`${user.tag.toUpperCase()}-${dbModel.infractionCount}\``, true)
                .addField("Time out ends", `\`${new Date(Date.now() + (interaction.options.getInteger("length") * 60 * 1000)).toUTCString()}\``, true)
                .setColor("BLUE")
                .setTimestamp();

            if (interaction.options.getInteger("length") === 0) {
                embed.setTitle("🛡️ User timeout removed");
                embed.setDescription(`<@${user.id}> / ${user.tag} (${user.id}) was unmuted by ***${interaction.user.tag}***.`);
                
                userEmbed.setTitle("🛡️ Your timeout was removed");
                userEmbed.setDescription(`You were unmuted by a staff member.`);
            } else {
                userEmbed.addField("Resolution", `You are unable to speak until your infraction has expired (or until an appeal has been accepted, whichever comes first). If you would like to appeal this infraction, please contact Support.`, false)
            };

            const guildUser = await interaction.guild.members.fetch(user.id);
            let timeoutAmount = interaction.options.getInteger("length");

            await guildUser.disableCommunicationUntil(Date.now() + (timeoutAmount * 60 * 1000), reason).then(async _ => {
                await user.send({ embeds: [userEmbed] }).catch(f => {
                    console.log(chalk.red(`[ERROR] Unable to send DM to user about case ${user.tag.toUpperCase()}-${dbModel.infractionCount}`));
                });
    
                await logsChannel.send({ embeds: [embed] });
    
                await client.db.set(`punishments.${user.id}`, dbModel);
    
                await interaction.editReply(`:mute: ${user.tag} was timed out successfully.`);
            }).catch(async f => {
                console.log(chalk.red(`[ERROR] Unable to timeout user ${user.tag} (Case ${user.tag.toUpperCase()}-${dbModel.infractionCount})`));
                await interaction.editReply(`:x: ${user.tag} couldn't be timed out.`);
            });
        };

        switch (operation) {
            case "warn":
                await warn();
                break;
            
            case "kick":
                await kick();
                break;

            case "ban":
                await ban();
                break;
                
            case "timeout":
                await timeout();
                break;
            
            default:
                await interaction.editReply("HOW THE FUCK DID YOU GET HERE?");
                break;
        };
    }
};