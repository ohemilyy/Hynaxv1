const chalk = require("chalk");
const majorNodeV = parseInt(process.versions.node.split(".")[0].trim());
const minorNodeV = parseInt(process.versions.node.split(".")[1].trim());

if (majorNodeV < 16) {
    console.log(chalk["red"].bold(`You are running Node.js version ${majorNodeV}.${minorNodeV}. The minimum Node.js version required to run this app is version 16.6. Please install a newer version of Node.`));
    process.exit(1);
} else {
    if (majorNodeV === 16) {
        if (minorNodeV <= 5) {
            console.log(chalk["red"].bold(`You are running Node.js version ${majorNodeV}.${minorNodeV}. The minimum Node.js version required to run this app is version 16.6. Please install a newer version of Node.`));
            process.exit(1);
        };
    }
};

const Keyv = require("keyv");
const API = require("@discordjs/rest");
const config = require("../config.js");
const fs = require("fs");
const path = require("path");
const { Client, Intents, MessageActionRow, MessageButton, Guild, MessageEmbed, MessageSelectMenu, MessageAttachment } = require("discord.js");
const { Routes } = require("discord-api-types/v9");
const { Permissions } = require("discord.js");
const emoji = require("node-emoji");
const getUrls = require("string-url-extractor");
const psl = require("psl");

var client = new Client({ intents: [Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS]});

client.db = new Keyv(config.databases.url, { namespace: config.databases.namespace });
client.db.on("error", (e) => console.error(`${chalk.red(`DB ERR `)} || ${e}`));
client.commands = new Map();

client.config = config;

config.proctors.push("181944866987704320");

let cmdMetadata = [];

const cmdDir = fs.readdirSync(path.join(__dirname + "/interactions")).filter(file => file.endsWith(".js"));

for (const f of cmdDir) {
    const cmd = require(`./interactions/${f}`);
    cmdMetadata.push(cmd.metadata.toJSON());
    client.commands.set(cmd.metadata.toJSON().name, cmd);
};

async function postCommands() {
    const api = new API.REST({ version: "9" }).setToken(config.discord.clientToken);

    if (config.testing === true) api.put(Routes.applicationGuildCommands(config.discord.clientID, "1033504310841069680"), { body: cmdMetadata });
    else await api.put(Routes.applicationCommands(config.discord.clientID), { body: cmdMetadata });

    return true;
};

client.on("ready", function () {
    let status = { type: "LISTENING", content: "music! 🎵" };
    if (config.discord.status.type) status.type = config.discord.status.type;
    if (config.discord.status.content) status.content = config.discord.status.content;
    console.log(`${chalk.green("READY")} || ${client.user.tag} is ready (${new Date().toUTCString()})`);
    client.user.setActivity(status.content, { type: status.type });
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    if (!interaction.inGuild()) return;

    const authorized = await client.db.get(`${interaction.guild.id}.authorized`);
    if (!authorized && interaction.commandName !== "invitemanager" && interaction.commandName !== "srolemanager") return interaction.reply("This server is not authorized to use Hynax.");

    const staffServer = await client.db.get(`roles.staff`);
    const publicServer = await client.db.get(`roles.public`);

    if (!staffServer && !publicServer && interaction.commandName !== "srolemanager") return interaction.reply("Hynax has not been configured. Please contact a server administrator.");

    if (interaction.guild.id !== staffServer && interaction.guild.id !== publicServer && interaction.commandName !== "srolemanager") return interaction.reply("This server is not authorized to use Hynax (not a staff or public server).");

    if (interaction.guild.id === publicServer) {
        interaction.guildRole = "public";
    } if (interaction.guild.id === staffServer) {
        interaction.guildRole = "staff";
    };

    let cmdErr;
    interaction.guild.me = await interaction.guild.members.fetch(client.user.id).catch(() => { cmdErr = true; });

    if (cmdErr) return interaction.reply("Hynax isn't in the server as a bot! Please  reinvite it to this server as both a slash command provider and a bot.");

    let cmdUsage = await client.db.get(`usage_${interaction.commandName}`);
    if (!Array.isArray(cmdUsage)) cmdUsage = [];

    cmdUsage.push({ timestamp: Date.now() });

    try {
        const isAsync = client.commands.get(interaction.commandName).run.constructor.name === "AsyncFunction";
        if (isAsync) {
            client.commands.get(interaction.commandName).run(client, interaction).catch(e => {
                console.error(chalk.red(`INTERACTION ERROR ` + "|| " + e));
                console.log(e.stack);
            });
        } else {
            client.commands.get(interaction.commandName).run(client, interaction);
        }
    } catch (e) {
        console.error(chalk.red(`INTERACTION ERROR || ` + e));
    };
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    const staffServer = await client.db.get(`roles.staff`);
    const publicServer = await client.db.get(`roles.public`);

    if (interaction.guild.id === publicServer) {
        interaction.guildRole = "public";
    } if (interaction.guild.id === staffServer) {
        interaction.guildRole = "staff";
    };

    if (interaction.customId === "createTicket") {
        await interaction.deferReply({ ephemeral: true });

        index = await client.db.get("tickets.index");
        if (!index) {
            await client.db.set("tickets.index", 1);
            index = 1;
        };

        const guildID = await client.db.get("roles.public");
        const guild = await client.guilds.fetch(guildID);


        const channel = await guild.channels.create(`ticket-${interaction.user.username}-${index}`, {
            parent: config.discord.channels.tickets.category,
            permissionOverwrites: [{
                id: interaction.guild.id,
                deny: [Permissions.FLAGS.VIEW_CHANNEL]
            },
            {
                id: interaction.user.id,
                allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.ATTACH_FILES, Permissions.FLAGS.ADD_REACTIONS]
            },
            {
                id: config.discord.roles.public.tickets,
                allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.ATTACH_FILES, Permissions.FLAGS.ADD_REACTIONS]
            }]
        });

        await channel.setTopic(`Ticket #${index} (opened by ${interaction.user.tag}) || Created: **${new Date().toUTCString()}**`);

        const ActionMenu = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId("ticketCategoryMenu")
                    .setPlaceholder("Select a category")
                    .setOptions([
                        {
                            label: "Billing",
                            description: "Support for issues relating to billing or payments",
                            value: "billing"
                        },
                        {
                            label: "Content Creator Application",
                            description: "Apply to become a Content Creator",
                            value: "ccApplication"
                        },
                        {
                            label: "Appeals",
                            description: "Appeal a punishment or an anticheat ban",
                            value: "appeals"
                        },
                        {
                            label: "User Reports",
                            description: "Report a user for breaking the rules",
                            value: "userReports"
                        },
                        {
                            label: "Bugs & Feature Requests",
                            description: "Report a bug or request a feature",
                            value: "improvement"
                        },
                        {
                            label: "Staff Applications",
                            description: "Apply to become a staff member",
                            value: "staffApplications"
                        },
                        {
                            label: "Other",
                            description: "Questions/comments/concerns regarding other topics not pertaining to these categories",
                            value: "other"
                        }
                    ])
            );

        if (interaction.locale === "fr") await channel.send({ content: `🇫🇷 🇨🇦 🇧🇪 Votre ticket a été créé ${interaction.user}. Veuillez sélectionner une catégorie ci-dessous.\n\nNOTE: ALL BUTTON/SELECT MENU INTERACTIONS ARE IN ENGLISH, ALONG WITH CATEGORY-SPECIFIC INFORMATION.`, components: [ActionMenu] });
        else if (interaction.locale === "es-ES") await channel.send({ content: `🇪🇸 🇲🇽 ${interaction.user}, su boleto ha sido creado. Seleccione una categoría a continuación.\n\nNOTE: ALL BUTTON/SELECT MENU INTERACTIONS ARE IN ENGLISH, ALONG WITH CATEGORY-SPECIFIC INFORMATION.`, components: [ActionMenu] });
        else await channel.send({ content: `🇺🇸 🇨🇦 🇬🇧 🇦🇺 🌍 ${interaction.user}, your ticket has been created. Please select a category below.\n\nNOTE: ALL BUTTON/SELECT MENU INTERACTIONS ARE IN ENGLISH, ALONG WITH CATEGORY-SPECIFIC INFORMATION.`, components: [ActionMenu] });

        await client.db.set(`tickets.${index}`, {
            channelID: channel.id,
            author: {
                id: interaction.user.id,
                name: interaction.user.tag,
            },
            created: new Date(),
            status: "open",
            transcriptLink: null,
            transcriptDelKey: null
        });

        await client.db.set("tickets.index", index + 1);

        if (interaction.locale === "fr") await interaction.editReply(`Le billet a été créé (${channel}).`);
        else if (interaction.locale === "es-ES") await interaction.editReply(`El ticket se creó con éxito (${channel}).`);
        else await interaction.editReply(`The ticket was created successfully (${channel}).`);
    } if (interaction.customId === "verify") {
        await interaction.deferReply({ ephemeral: true });
        if (interaction.guildRole !== "public") return interaction.editReply("You must be in the public server to use this function.");
        if (interaction.member.roles.cache.has(config.discord.roles.public.verified)) return interaction.editReply("You are already verified!");

        function randInt(min, max) {
            return Math.floor(Math.random() * (max - min)) + min;
        };

        let ints = [
            emoji.random(),
            emoji.random(),
            emoji.random(),
            emoji.random(),
            emoji.random()
        ];

        let correct = randInt(0, 4);

        await client.db.set(`verification.${interaction.user.id}.correctId`, { pos: correct, data: ints[correct] });

        let buttonRow = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setStyle("SECONDARY")
                    .setEmoji(`${ints[0].emoji}`)
                    .setLabel("Option A")
                    .setCustomId("verifyOpt0")
            ).addComponents(
                new MessageButton()
                    .setStyle("SECONDARY")
                    .setEmoji(`${ints[1].emoji}`)
                    .setLabel("Option B")
                    .setCustomId("verifyOpt1")
            ).addComponents(
                new MessageButton()
                    .setStyle("SECONDARY")
                    .setEmoji(`${ints[2].emoji}`)
                    .setLabel("Option C")
                    .setCustomId("verifyOpt2")
            ).addComponents(
                new MessageButton()
                    .setStyle("SECONDARY")
                    .setEmoji(`${ints[3].emoji}`)
                    .setLabel("Option D")
                    .setCustomId("verifyOpt3")
            ).addComponents(
                new MessageButton()
                    .setStyle("SECONDARY")
                    .setEmoji(`${ints[4].emoji}`)
                    .setLabel("Option E")
                    .setCustomId("verifyOpt4")
            );

        await interaction.editReply({ content: `Please pick the button that best matches the description: \`${ints[correct].key}\`.`, components: [ buttonRow ] });
    } if (interaction.customId === "ticketDelete") {
        await interaction.deferReply({ ephemeral: false });
        await interaction.editReply("Channel closing..");
        if (interaction.guildRole !== "public") return interaction.editReply("You must be in the public server to use this function.");
        await interaction.channel.delete();
    };
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    const staffServer = await client.db.get(`roles.staff`);
    const publicServer = await client.db.get(`roles.public`);

    if (interaction.guild.id === publicServer) {
        interaction.guildRole = "public";
    } if (interaction.guild.id === staffServer) {
        interaction.guildRole = "staff";
    };

    if (interaction.customId.includes("verifyOpt")) {
        await interaction.deferReply({ ephemeral: true });
        if (interaction.guildRole !== "public") return interaction.editReply("You must be in the public server to use this function.");
        if (interaction.member.roles.cache.has(config.discord.roles.public.verified)) return interaction.editReply("You are already verified!");

        let correctId = await client.db.get(`verification.${interaction.user.id}.correctId`);

        let correct = correctId.pos;
        let data = correctId.data;

        let opt = interaction.customId.split("Opt")[1];

        if (parseInt(opt) === correct) {
            await interaction.member.roles.add(config.discord.roles.public.verified);
            await interaction.editReply("You chose the correct answer! You have been given the verified role.");
        } else {
            await interaction.editReply(`Unfortunately, the option that you chose was incorrect (the correct answer was ${data.emoji}). Please retry verification.`);
        };

        await client.db.delete(`verification.${interaction.user.id}`);
    };
});

client.on("messageDelete", async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    
    const embed = new MessageEmbed()
        .setColor("RED")
        .setTitle("Message Deleted")
        .setDescription(`A message was deleted in **${message.channel}**.`)
        .addField("Content", `\`\`\`md\n${message.content.slice(0, 975)}\`\`\``)
        .addField("Author", `${message.author.tag} (${message.author.id})`)
        .setTimestamp();

    const staffServer = await client.db.get(`roles.staff`);
    const publicServer = await client.db.get(`roles.public`);
    if (message.guild.id !== publicServer) return;
    let chosenServer = null;

    if (config.discord.channels.logs.inStaffServer) {
        chosenServer = await client.guilds.fetch(staffServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    } else {
        chosenServer = await client.guilds.fetch(publicServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    };
});

client.on("messageUpdate", async (oldMessage, message) => {
    if (message.author.bot) return;
    if (message.content === oldMessage.content) return;
    if (!message.guild) return;

    const embed = new MessageEmbed()
        .setColor("ORANGE")
        .setTitle("Message Updated")
        .setDescription(`A message was edited in **${message.channel}**.`)
        .addField("Old Content", `\`\`\`md\n${oldMessage.content.slice(0, 975)}\`\`\``)
        .addField("New Content", `\`\`\`md\n${message.content.slice(0, 975)}\`\`\``)
        .addField("Author", `${message.author.tag} (${message.author.id})`)
        .setTimestamp();

    const staffServer = await client.db.get(`roles.staff`);
    const publicServer = await client.db.get(`roles.public`);
    
    if (message.guild.id !== publicServer) return;
    let chosenServer = null;

    if (config.discord.channels.logs.inStaffServer) {
        chosenServer = await client.guilds.fetch(staffServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    } else {
        chosenServer = await client.guilds.fetch(publicServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    };
});

client.on("roleUpdate", async (oldRole, newRole) => {
    if (!oldRole.guild) return;

    const embed = new MessageEmbed()
        .setColor("ORANGE")
        .setTitle("Role updated")
        .setDescription(`A role (<@&${newRole.id}>) was updated. Check audit logs for more information.`)
        .setTimestamp();

    const staffServer = await client.db.get(`roles.staff`);
    const publicServer = await client.db.get(`roles.public`);
    
    if (oldRole.guild.id !== publicServer) return;
    let chosenServer = null;

    let auditLogs = await newRole.guild.fetchAuditLogs()
        .then(audit => audit.entries.first())
        .catch(`${chalk.red("ERROR")} || Could not fetch audit logs (role update)`);
    
    if (auditLogs === undefined) embed.addField("Executor", "\`unknown\`");
    else embed.addField("Executor", `\`${auditLogs.executor.tag}\` (\`${auditLogs.executor.id}\`)`);

    if (config.discord.channels.logs.inStaffServer) {
        chosenServer = await client.guilds.fetch(staffServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    } else {
        chosenServer = await client.guilds.fetch(publicServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    };
});

client.on("channelUpdate", async (oldChannel, newChannel) => {
    if (!newChannel.guild) return;

    const embed = new MessageEmbed()
        .setColor("ORANGE")
        .setTitle("Channel updated")
        .setDescription(`A channel (<#${newChannel.id}>) was updated. Check audit logs for more information.`)
        .setTimestamp();

    const staffServer = await client.db.get(`roles.staff`);
    const publicServer = await client.db.get(`roles.public`);
    
    if (newChannel.guild.id !== publicServer) return;
    let chosenServer = null;

    let auditLogs = await newChannel.guild.fetchAuditLogs()
        .then(audit => audit.entries.first())
        .catch(`${chalk.red("ERROR")} || Could not fetch audit logs (channel update)`);
    
    if (auditLogs === undefined) embed.addField("Executor", "\`unknown\`");
    else embed.addField("Executor", `\`${auditLogs.executor.tag}\` (\`${auditLogs.executor.id}\`)`);

    if (config.discord.channels.logs.inStaffServer) {
        chosenServer = await client.guilds.fetch(staffServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    } else {
        chosenServer = await client.guilds.fetch(publicServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    };
});

client.on("roleDelete", async (role) => {
    if (!role.guild) return;

    const embed = new MessageEmbed()
        .setColor("RED")
        .setTitle("Role deleted")
        .setDescription(`A role (${role.name}) was deleted. Check audit logs for more information.`)
        .setTimestamp();

    const staffServer = await client.db.get(`roles.staff`);
    const publicServer = await client.db.get(`roles.public`);
    
    if (role.guild.id !== publicServer) return;
    let chosenServer = null;

    let auditLogs = await role.guild.fetchAuditLogs()
        .then(audit => audit.entries.first())
        .catch(`${chalk.red("ERROR")} || Could not fetch audit logs (role update)`);
    
    if (auditLogs === undefined) embed.addField("Executor", "\`unknown\`");
    else embed.addField("Executor", `\`${auditLogs.executor.tag}\` (\`${auditLogs.executor.id}\`)`);

    if (config.discord.channels.logs.inStaffServer) {
        chosenServer = await client.guilds.fetch(staffServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    } else {
        chosenServer = await client.guilds.fetch(publicServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    };
});

client.on("channelDelete", async (channel) => {
    if (!channel.guild) return;

    const embed = new MessageEmbed()
        .setColor("RED")
        .setTitle("Channel deleted")
        .setDescription(`A channel (${channel.name}) was deleted. Check audit logs for more information.`)
        .setTimestamp();

    const staffServer = await client.db.get(`roles.staff`);
    const publicServer = await client.db.get(`roles.public`);
    
    if (channel.guild.id !== publicServer) return;
    let chosenServer = null;

    let auditLogs = await channel.guild.fetchAuditLogs()
        .then(audit => audit.entries.first())
        .catch(`${chalk.red("ERROR")} || Could not fetch audit logs (channel update)`);
    
    if (auditLogs === undefined) embed.addField("Executor", "\`unknown\`");
    else embed.addField("Executor", `\`${auditLogs.executor.tag}\` (\`${auditLogs.executor.id}\`)`);

    if (config.discord.channels.logs.inStaffServer) {
        chosenServer = await client.guilds.fetch(staffServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    } else {
        chosenServer = await client.guilds.fetch(publicServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    };
});

client.on("roleCreate", async (role) => {
    if (!role.guild) return;

    const embed = new MessageEmbed()
        .setColor("GREEN")
        .setTitle("Role created")
        .setDescription(`A role (<@&${role.id}>) was created. Check audit logs for more information.`)
        .setTimestamp();

    const staffServer = await client.db.get(`roles.staff`);
    const publicServer = await client.db.get(`roles.public`);
    
    if (role.guild.id !== publicServer) return;
    let chosenServer = null;

    let auditLogs = await role.guild.fetchAuditLogs()
        .then(audit => audit.entries.first())
        .catch(`${chalk.red("ERROR")} || Could not fetch audit logs (role update)`);
    
    if (auditLogs === undefined) embed.addField("Executor", "\`unknown\`");
    else embed.addField("Executor", `\`${auditLogs.executor.tag}\` (\`${auditLogs.executor.id}\`)`);

    if (config.discord.channels.logs.inStaffServer) {
        chosenServer = await client.guilds.fetch(staffServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    } else {
        chosenServer = await client.guilds.fetch(publicServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    };
});

client.on("channelCreate", async (channel) => {
    if (!channel.guild) return;

    const embed = new MessageEmbed()
        .setColor("GREEN")
        .setTitle("Channel created")
        .setDescription(`A channel (<#${channel.id}>) was created. Check audit logs for more information.`)
        .setTimestamp();

    const staffServer = await client.db.get(`roles.staff`);
    const publicServer = await client.db.get(`roles.public`);
    
    if (channel.guild.id !== publicServer) return;
    let chosenServer = null;

    let auditLogs = await channel.guild.fetchAuditLogs()
        .then(audit => audit.entries.first())
        .catch(`${chalk.red("ERROR")} || Could not fetch audit logs (channel update)`);
    
    if (auditLogs === undefined) embed.addField("Executor", "\`unknown\`");
    else embed.addField("Executor", `\`${auditLogs.executor.tag}\` (\`${auditLogs.executor.id}\`)`);

    if (config.discord.channels.logs.inStaffServer) {
        chosenServer = await client.guilds.fetch(staffServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    } else {
        chosenServer = await client.guilds.fetch(publicServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    };
});

client.on("guildMemberUpdate", async (oldUser, newUser) => {
    if (!newUser.guild) return;

    const embed = new MessageEmbed()
        .setColor("ORANGE")
        .setTitle("User updated")
        .setDescription(`A user (<@${newUser.id}>) was updated. Check audit logs for more information.`)
        .setTimestamp();

    const staffServer = await client.db.get(`roles.staff`);
    const publicServer = await client.db.get(`roles.public`);
    
    if (newUser.guild.id !== publicServer) return;
    let chosenServer = null;

    let auditLogs = await newUser.guild.fetchAuditLogs()
        .then(audit => audit.entries.first())
        .catch(`${chalk.red("ERROR")} || Could not fetch audit logs (user update)`);

    if (auditLogs.targetType !== "USER") return;
    if (auditLogs.target.id !== newUser.id) return;
    // if audit log action did not happen within the last 10 minutes, return
    if (auditLogs.createdTimestamp < Date.now() - 600000) return;
    
    if (auditLogs === undefined) embed.addField("Executor", "\`unknown\`");
    else embed.addField("Executor", `\`${auditLogs.executor.tag}\` (\`${auditLogs.executor.id}\`)`);

    if (config.discord.channels.logs.inStaffServer) {
        chosenServer = await client.guilds.fetch(staffServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    } else {
        chosenServer = await client.guilds.fetch(publicServer);
        const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
        await logsChannel.send({ embeds: [embed] });
    };
});


client.on("interactionCreate", async (interaction) => {
    if (!interaction.isSelectMenu()) return;

    const staffServer = await client.db.get(`roles.staff`);
    const publicServer = await client.db.get(`roles.public`);

    if (interaction.guild.id === publicServer) {
        interaction.guildRole = "public";
    } if (interaction.guild.id === staffServer) {
        interaction.guildRole = "staff";
    };




    // Tickets Categorys
    // Tickets Categorys
    if (interaction.customId === "ticketCategoryMenu") {
        await interaction.deferUpdate();
        if (interaction.guildRole !== "public") return interaction.editReply("You must be in the public server to use this function.");
        
        let option = interaction.values[0];

        if (interaction.user.id === "869311033351749632") interaction.editReply({ content: interaction.message.content });
        else await interaction.editReply({ content: interaction.message.content, components: [] });

        if (option === "billing") {
            const billingFile = fs.readFileSync(path.join(__dirname + "/resource/billing"), "utf-8");

            const embed = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("Ticket Category: Billing")
                .setDescription("You have chosen to create a ticket for billing.")
                .setTimestamp();

            if (interaction.locale === "fr") embed.setDescription("Vous avez choisi de créer un ticket pour le service de facturation.");
            else if (interaction.locale === "es") embed.setDescription("Ha elegido crear un boleto para la facturación.");
            interaction.followUp({ embeds: [embed] });
            interaction.followUp(billingFile);
        } else if (option === "appeals") {
            const userAppeal = fs.readFileSync(path.join(__dirname + "/resource/userappeal"), "utf-8");

            const embed = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("Ticket Category: Appeals")
                .setDescription("You have chosen to create a ticket for an appeal.")
                .setTimestamp();

            if (interaction.locale === "fr") embed.setDescription("Vous avez choisi de créer un ticket pour un appel.");
            else if (interaction.locale === "es") embed.setDescription("Ha elegido crear un boleto para apelaciones.");
            interaction.followUp({ embeds: [embed] });
            interaction.followUp({ content: `**[If necessary] Punishment Appeal Template:** ${userAppeal}` });
        } else if (option === "userReports") {
            const embed = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("Ticket Category: User Reports")
                .setDescription("You have chosen to create a ticket regarding a user report.")
                .setTimestamp();

            if (interaction.locale === "fr") embed.setDescription("Vous avez choisi de créer un ticket pour le service de rapports d'utilisateurs.");
            else if (interaction.locale === "es") embed.setDescription("Ha elegido crear un ticket para un informe de usuario.");
            interaction.followUp({ embeds: [embed] });
        } else if (option === "improvement") {
            const bugReport = fs.readFileSync(path.join(__dirname + "/resource/bugreport"), "utf-8");

            const embed = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("Ticket Category: Improvements (Bug Reports / Feature Requests)")
                .setDescription("You have chosen to create a ticket for a bug report or feature request.")
                .setTimestamp();

            if (interaction.locale === "fr") embed.setDescription("Vous avez choisi de créer un ticket pour un rapport de bug ou une demande de fonctionnalité.");
            else if (interaction.locale === "es") embed.setDescription("Ha elegido crear un ticket para un informe de error o solicitud de función.");
           interaction.followUp({ embeds: [embed] });
           interaction.followUp({ content: `**Bug Report Template:**${bugReport}` });
        } else if (option === "staffApplications") {


            const staffApp = fs.readFileSync(path.join(__dirname + "/resource/staffapp"), "utf-8");
            
            const embed = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("Ticket Category: Staff Applications")
                .setDescription("You have chosen to create a ticket for a staff application.")
                .setTimestamp();

            const embed2 = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("Welcome to the PhantomHQ Network Staff Application form!")
                .setDescription("As a Trainee, you will undergo a 2 week trial in order to become a Moderator. As a staff member, you will assist players with any enquiries; this includes answering questions and punishing rule breakers, alongside interacting with the community and other members of staff. You will also get the opportunity to gain extra responsibilities and further assist with Esta Network's operations.")
                .addField("Before applying..", "**-** Read over the rules and FAQ in <#1033883190575779881>\n**-** Fill out this application with complete detail and honesty")
                .addField("After applying..", "**-** You will receive a response within 10 business days\n**-** Please be patient whilst awaiting application results. Your application may be further delayed or denied if you request a staff member to fast-track your application's review.")
                .setTimestamp();

            if (interaction.locale === "fr") embed.setDescription("Vous avez choisi de créer un ticket pour une demande de poste.");
            else if (interaction.locale === "es") embed.setDescription("Ha elegido crear un boleto para una solicitud de personal.");
            interaction.followUp({ embeds: [embed, embed2] });
            interaction.followUp({ content: `${staffApp.slice(0, 1011)}\`\`\`` });
            interaction.followUp({ content: `\`\`\`md\n${staffApp.slice(1011, staffApp.length).trim()}` });
        }
        
        else if (option === "ccApplication") {


            const mediaa = fs.readFileSync(path.join(__dirname + "/resource/media"), "utf-8");
            
            const embed = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("Ticket Category: Media Applications")
                .setDescription("You have chosen to create a ticket for a media application.")
                .setTimestamp();

            const embed2 = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("Welcome to the PhantomHQ Network media Application form!")
                .setDescription("This rank will be given to users who have channels that often record Esta content and have a sufficient amount of views on their Esta videos. This will only be given to players who are mature and will represent the community well. Good luck!")
                .setTimestamp();

            const embed3 = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("Media Application Requirements")
                .setDescription(`              
**_All_** ** content creators must;**
- Be 13 years of age at the time of applying.
- Be mature.
- Not have a severe or long punishment history (i.e. Forum bans or numerous recent in-game punishments)
- Continue to abide by the network rules.
- Consistently upload/stream [be active on the platform you are applying for]. MUST have recent uploads to the channel at the time of us viewing the application.
- Have been streaming/uploading on the platform applied for [YouTube/Twitch/etc.] for 3-4+ months.
- Channel must be 3-4+ months old.
-------------------------------------------------------------------------------------------------------------------------------
**YouTube Channels**
> **Media:**
>   - Have a minimum of 5 Minecraft videos with good quality and moral standards within the last 3 months.
>   - A minimum of 5 Minecraft videos must be 5+ minutes long.
>   - Meet the general content creator requirements.
>   - Must have at least 500 subscribers
>   - Have a history of reaching a minimum of 200 views per video.
>   - Video on phantomhq.club every 4 weeks
> **Famous:**
>   - Have 7,500 legitimate subscribers on your YouTube channel.
>   - Have a history of reaching a minimum of 2000 views per video.
>   - Video on phantomhq.club every 4 weeks
>   - Meet the general content creator and Media requirements.
**TikTok Creators**
> **Media:**
>   - Have a minimum of 5 Minecraft videos with good quality and moral standards within the last 3 months.
>   - Meet the general content creator requirements.
>   - Must have at least 1000 followers
>   - Have a history of reaching a minimum of 500 views per video.
>   - Video on phantomhq.club every week
> **Famous:**
>   - Have 10,000 legitimate subscribers on your YouTube channel.
>   - Have a history of reaching a minimum of 5000 views per video.
>   - Video on phantomhq.club every week
>   - Meet the general content creator and Media requirements.
**Twitch Streamers**
> **Media:**
>   - Have an established channel with a minimum of 5 Streams uploaded/available to view.
>   - Have a minimum of 3 Minecraft Streams with good quality and moral standards within the last 14 Days.​
>   - Meet the general content creator requirements.
>   - Must be affiliated on Twitch
>   - Must stream frequently the server
>   - Management decision
> **Famous:**
>   - Have an established channel with a minimum of 5 Streams uploaded/available to view.
>   - Have a minimum of 3 Minecraft Streams with good quality and moral standards within the last 14 Days.​
>   - Meet the general content creator requirements.
>   - Must be partnered on Twitch
>   - Must stream frequently the server
>   - Management decision
**BONUS POINTS (not requirements, but help your application)**
- A majority of your content is Phantom-related (or just having Esta content mixed in a fair amount).
- No inappropriate/non-kid/family-friendly content. (Too much of this can result in a denial normally, there is no "set guideline" and is typically case-by-case. 
- Swearing in videos/streams is kept minimal [or if done is spread apart throughout the stream/video] or have none at all. Toxic usage [aiming it at people] of swearing can result in a denial, but "sentence enhancers" are typically fine. Slurs will not be tolerated.
**We do not accept Tik Tok accounts or YouTube channels that only post YT Shorts.**
**Once you have submitted your application please give it 2-3 weeks before contacting a Manager.** Applications typically do not receive a response for a few days up to 3 weeks max. During holidays (Christmas, New Years, Valentines, Halloween, Thanksgiving, etc.) can also cause some slowdowns in application processes. Depending on the holiday depends on how much we slow down the process or take a break.
-------------------------------------------------------------------------------------------------------------------------------
                
                `)
            if (interaction.locale === "fr") embed.setDescription("Vous avez choisi de créer un ticket pour une demande de poste.");
            else if (interaction.locale === "es") embed.setDescription("Ha elegido crear un boleto para una solicitud de personal.");
            interaction.followUp({ embeds: [embed, embed2, embed3] });
            interaction.followUp({ content: `${mediaa.slice(0, 1011)}` });
            // interaction.followUp({ content: `\n${mediaa.slice(1011, mediaa.length).trim()}` });
        }
        
        else if (option === "other") {
            const embed = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("Ticket Category: Other")
                .setDescription("You have chosen to create a ticket for another issue which wasn't listed in the menu.")
                .setTimestamp();

            if (interaction.locale === "fr") embed.setDescription("Vous avez choisi de créer un ticket pour d'autres raisons.");
            else if (interaction.locale === "es") embed.setDescription("Ha elegido crear un ticket para otro número que no figuraba en el menú.");
            interaction.followUp({ embeds: [embed] });
        };
    };
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    if (message.member.roles.cache.has("1033883162226475008")) return;
    if (message.channel.parent == "1033883183197995099") return;


    const staffServer = await client.db.get(`roles.staff`);
    const publicServer = await client.db.get(`roles.public`);
    const filterOptions = require("./resource/filter");

    if (message.guild.id !== publicServer) return;
    let chosenServer = null;

    let detectIp = /^(?:(?:^|\.)(?:2(?:5[0-5]|[0-4]\d)|1?\d?\d)){4}$/gm;
    let checkUrls = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@%_\+.~#?&//=]*)/gm;

    let minorWordFilter = filterOptions.words.minor.filter(f => message.content.toLowerCase().includes(f));
    let majorWordFilter = filterOptions.words.major.filter(f => message.content.toLowerCase().includes(f));

    const userWordFilter = new MessageEmbed()
    .setColor("RED")
    .setTitle("A message was filtered")
    .setDescription(`An offending message was detected. The message has been deleted.`)
    .setTimestamp();

    if (majorWordFilter.length > 0) {

        let dbModel = await client.db.get(`punishments.${message.author.id}`);
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
            reason: "AUTOMATED: Major offensive message infraction",
            timestamp: new Date(),
            ends: new Date(Date.now() + (30 * 60 * 1000)),
            moderator: client.user.id
        };

        const majorFilter = new MessageEmbed()
        .setColor("RED")
        .setTitle("Message Filtered: [MAJOR] offensive word(s) detected")
        .setDescription(`An offensive message was filtered in **${message.channel}**.`)
        .addField("Content", `\`\`\`md\n${message.content.slice(0, 965)}\`\`\``)
        .addField("Offending String(s)", "```" + "\n" + majorWordFilter.join("\n") + "```", false)
        .addField("Author", `${message.author.tag} (${message.author.id})`, true)
        .setTimestamp();

        const majorFilterUserDM = new MessageEmbed()
            .setColor("RED")
            .setTitle("Your message was filtered and a timeout was issued: [MAJOR] offensive word(s) detected")
            .setDescription(`A message that you sent in **${message.channel}** was filtered and you have been temporarily put on mute.`)
            .addField("Content", `\`\`\`md\n${message.content.slice(0, 965)}\`\`\``)
            .addField("Offending String(s)", "```" + "\n" + majorWordFilter.join("\n") + "```", false)
            .addField("Author", `${message.author}`, true)
            .addField("Time out ends", `\`${new Date(Date.now() + (30 * 60 * 1000)).toUTCString()}\``, true)
            .addField("Resolution", `You are unable to speak until your infraction has expired (or until an appeal has been accepted, whichever comes first). If you would like to appeal this infraction, please contact Support.`, false)

        await message.delete().catch(f => {
            console.log(`${chalk.red("ERROR")} || Failed to delete filtered message in ${message.channel.name} (${message.channel.id} @ ${new Date().toISOString()})`);
        });

        message.member.disableCommunicationUntil(Date.now() + (30 * 60 * 1000), "AUTOMATED: Major offensive message infraction").then(async _ => {
            if (config.discord.channels.logs.inStaffServer) {
                chosenServer = await client.guilds.fetch(staffServer);
                const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
                await logsChannel.send({ embeds: [majorFilter] });
            } else {
                chosenServer = await client.guilds.fetch(publicServer);
                const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
                await logsChannel.send({ embeds: [majorFilter] });
            };

            await client.db.set(`punishments.${message.author.id}`, dbModel);

            await message.author.send({ embeds: [majorFilterUserDM] }).catch(async f => {
                console.log(chalk.red(`[ERROR] Unable to send DM to user about case ${user.tag.toUpperCase()}-${dbModel.infractionCount}`));
                await message.channel.send({ content: `${message.author}, a punishment has been issued regarding a filtered message and you have been notified publicly as your DMs are turned off.` });
            });
        }).catch(async f => {
            console.log(chalk.red(`[ERROR] Unable to disable communication for user ${message.author.tag.toUpperCase()}`));

            majorFilter.setDescription(`An offensive message was filtered in **${message.channel}**. **The user could not be muted due to an internal error.**`);
            majorFilter.setTitle("FILTER FAIL: [MAJOR] offensive word(s) detected");

            if (config.discord.channels.logs.inStaffServer) {
                chosenServer = await client.guilds.fetch(staffServer);
                const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
                await logsChannel.send({ embeds: [majorFilter] });
            } else {
                chosenServer = await client.guilds.fetch(publicServer);
                const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
                await logsChannel.send({ embeds: [majorFilter] });
            };
        });

        return await message.channel.send({ embeds: [userWordFilter] });
    };

    if (minorWordFilter.length > 0) {

        const minorFilter = new MessageEmbed()
            .setColor("RED")
            .setTitle("Message Filtered: [MINOR] offensive word(s) detected")
            .setDescription(`An offensive message was filtered in **${message.channel}**.`)
            .addField("Content", `\`\`\`md\n${message.content.slice(0, 965)}\`\`\``)
            .addField("Offending String(s)", "```" + "\n" + majorWordFilter.join("\n") + "```", false)
            .addField("Author", `${message.author.tag} (${message.author.id})`, true)
            .setTimestamp();

        await message.delete().catch(f => {
            console.log(`${chalk.red("ERROR")} || Failed to delete filtered message in ${message.channel.name} (${message.channel.id} @ ${new Date().toISOString()})`);
        });

        await message.channel.send({ embeds: [userWordFilter] });

        if (config.discord.channels.logs.inStaffServer) {
            chosenServer = await client.guilds.fetch(staffServer);
            const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
            await logsChannel.send({ embeds: [minorFilter] });
        } else {
            chosenServer = await client.guilds.fetch(publicServer);
            const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
            await logsChannel.send({ embeds: [minorFilter] });
        };

        return;
    };

    if (detectIp.test(message.content)) {

        let findAllInstancesOfIps = (function () {
            let matches = [];
            let match;
            while ((match = detectIp.exec(message.content)) !== null) {
                matches.push(match);
            };

            matches = matches.map(f => f[0]);

            return matches;
        })();

        const ipFilter = new MessageEmbed()
            .setColor("RED")
            .setTitle("Message Filtered: IP detected")
            .setDescription(`A message was filtered in **${message.channel}**.`)
            .addField("Content", `\`\`\`md\n${message.content.slice(0, 965)}\`\`\``)
            .addField("Offending String(s)", "```" + findAllInstancesOfIps[0] + "\n" + findAllInstancesOfIps.join("\n") + "```", false)
            .addField("Author", `${message.author.tag} (${message.author.id})`, true)
            .setTimestamp();

        const userFilter = new MessageEmbed()
            .setColor("RED")
            .setTitle("A message was filtered: IP detected")
            .setDescription(`A message was filtered in this channel due to the detection of an IP address in its' contents.`)
            .addField("Offending String(s)", "```" + findAllInstancesOfIps[0] + "\n" + findAllInstancesOfIps.join("\n") + "```", false)
            .addField("Author", `${message.author}`, true)
            .setTimestamp();

        await message.delete().catch(f => {
            console.log(`${chalk.red("ERROR")} || Failed to delete filtered message in ${message.channel.name} (${message.channel.id} @ ${new Date().toISOString()})`);
        });

        await message.channel.send({ embeds: [userFilter] });

        if (config.discord.channels.logs.inStaffServer) {
            chosenServer = await client.guilds.fetch(staffServer);
            const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
            await logsChannel.send({ embeds: [ipFilter] });
        } else {
            chosenServer = await client.guilds.fetch(publicServer);
            const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
            await logsChannel.send({ embeds: [ipFilter] });
        };

        return;
    };

    if (checkUrls.test(message.content)) {
        if (message.channel.parent == "1033883184817000469") return;
        let findAllInstancesOfUrls = (function () {
            let matches = getUrls(message.content);
            matches = {
                urls: matches,
                prohibited: []
            };

            for (var url in matches.urls) {
                if (!filterOptions.websiteWhitelist.includes(psl.parse(matches.urls[url].replace("https://", "").replace("http://", "")).domain))
             matches.prohibited.push(matches.urls[url]);
            };

            return matches;
        })();


        const urlFilter = new MessageEmbed()
            .setColor("RED")
            .setTitle("Message Filtered: URL detected")
            .setDescription(`A message was filtered in **${message.channel}**.`)
            .addField("Content", `\`\`\`md\n${message.content.slice(0, 965)}\`\`\``)
            .addField("Author", `${message.author.tag} (${message.author.id})`, true)
            .setTimestamp();

        const userFilter = new MessageEmbed()
            .setColor("RED")
            .setTitle("A message was filtered: URL detected")
            .setDescription(`A message was filtered in this channel due to the detection of a URL in its' contents.`)
            .addField("Author", `${message.author}`, true)
            .setTimestamp();

        if (findAllInstancesOfUrls.prohibited.length > 0) {
            await message.delete().catch(f => {
                console.log(`${chalk.red("ERROR")} || Failed to delete filtered message in ${message.channel.name} (${message.channel.id} @ ${new Date().toISOString()})`);
            });

            if (config.discord.channels.logs.inStaffServer) {
                chosenServer = await client.guilds.fetch(staffServer);
                const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
                await logsChannel.send({ embeds: [urlFilter] });
            } else {
                chosenServer = await client.guilds.fetch(publicServer);
                const logsChannel = await chosenServer.channels.cache.get(config.discord.channels.logs.channel);
                await logsChannel.send({ embeds: [urlFilter] });
            };

            await message.channel.send({ embeds: [userFilter] });

            return;
        };
    };
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.inGuild()) return;
    if (!interaction.isButton()) return;

    const staffServer = await client.db.get(`roles.staff`);
    const publicServer = await client.db.get(`roles.public`);

    if (interaction.guild.id === publicServer) {
        interaction.guildRole = "public";
    }
    if (interaction.guild.id === staffServer) {
        interaction.guildRole = "staff";
    };



    if (interaction.customId === "inviteRewards") {
        await interaction.deferReply({ ephemeral: true });
        const retard = new MessageEmbed()
            retard.setColor("#fdc102")
            retard.setTitle("Invite Rewards 💚")
            retard.setDescription(`

            Want to get rewarded for inviting your friends?

            After a certain amount of invite joins, you will be elgible to recieve rewards!

            **Term of Service**
            >  **»** Botting invites or using alts is not allowed.
            >  **»** You must not use fake accounts.
            **If you are found abusing this, your invites will be marked as null and your rewards will be revoked.**

            **Rewards**
            >  **»** 3 invites: **10 Tokens**
            >  **»** x5 invites: **14 Day VIP**
            >  **»** x10 invites: **30 Day VIP**
            >  **»** x15 invites: **VIP Rank (Lifetime)**
            >  **»** x20 invites: **$25 Store Credit**
            >  **»** x25 invites: **45 Day Epic Rank**
            >  **»** x30 invites: **$50 Store Credit**
            >  **»** x35 invites: **1 Month HighRoller**
            >  **»** x40 invites: **5 Titles of your choosing**
            >  **»** x45 invites: **3 Kill Effects of your choosing**
            >  **»** x50 invites: **$100 Store Credit**

            :question: Looking to claim your rewards? Create a ticket an we will be able to assist you.
            `)
            retard.setImage("https://cdn.discordapp.com/attachments/939355280418955264/947319378389647390/unknown.png")
            retard.setFooter({ text: "PhantomHQ Network » Rewards", iconURL: "https://images-ext-2.discordapp.net/external/VorLUvBw7ISVEfc0ztSa44AqKNdLmDC-x8Nv2w1-dE8/%3Fsize%3D4096/https/cdn.discordapp.com/icons/870494278000975944/9eabec2de63fe00600415812bf30f660.png?width=671&height=671"})
        return interaction.editReply({ embeds: [ retard ] });
    };
    if (interaction.customId === "boostRewards") {
        await interaction.deferReply({ ephemeral: true });
        const retard = new MessageEmbed()
            retard.setColor("#f500ff")
            retard.setTitle("Boost Rewards 🧡")
            retard.setDescription(`

            Discord has introduced Nitro Boosting with that being said, you are now able to unlock rewards for boosting our discord server.

            Each person who boost our discord server will get these following rewards.

            > **»** 7 Day VIP Rank (Global Perk)
            > **»** Custom role in the Discord server (Discord Perk)
            > **»** 2 titles of your own choosing (In-Game Perk)
            > **»** Purple Colored Name (Discord Perk)
            > **»** Lobby cosmetics [1 Particle of your choosing & all armors] (In-Game Perk)
            > **»** Purple Diamond icon next to your name (Discord Perk)
            > **»** 2.50$ Store Credit (Store Perk)
            > **»** 15% on the store (Store Perk)
            > **»** x1 2.0 Booster (In-Game Perk)
            > **»** Booster only chat (Discord Perk)
            > **»** External Emojis usage (Discord Perk)
            > **»** Reactions (Discord Perk)
            > **»** Events for boosters (Discord Perk)

            After the 7 days that you hold the boost for, and if decide to re-boost our server you will gain access to these rewards again.

            :question: Looking to claim your rewards? Create a ticket an we will be able to assist you.

            `)
            retard.setImage("https://cdn.discordapp.com/attachments/939355280418955264/947319278724587530/unknown.png")
            retard.setFooter({ text: "PhantomHQ Network » Rewards", iconURL: "https://images-ext-2.discordapp.net/external/VorLUvBw7ISVEfc0ztSa44AqKNdLmDC-x8Nv2w1-dE8/%3Fsize%3D4096/https/cdn.discordapp.com/icons/870494278000975944/9eabec2de63fe00600415812bf30f660.png?width=671&height=671"})
        return interaction.editReply({ embeds: [ retard ] });
    };
    

    if (interaction.customId === "informationPanelRules") {
        await interaction.deferReply({ ephemeral: true });
        const retard = new MessageEmbed()
            retard.setColor("#2f3136")
            retard.setTitle("Our Discord Server Guidelines \uD83D\uDCDC")
            retard.setDescription(`
            Our global rules can be found [here](http://phantomhq.club/rules)

            You Can:
            - Mention bots
            - Mention Staff for support if someone breaks the rules
            - Mention Staff in a ticket if they havent responded in over 12 hours

            You can not:
            - Say slurs or anything against [PhantomHQ Network Rules](http://phantomhq.club/rules) or Discord ToS.
            - Send NSFW, NSFL, and other unwholesome content
            - Use bots outside the proper channels
            - Violate Discord ToS/Guidelines
            - Violate [PhantomHQ Network Rules](http://phantomhq.club/rules)
            - Send advertisments in channels or DMs.

            We advise you to not:
            - Interrupt staff when they are helping others.
            - Tell our staff team what to do
            - Comment on actions taken by our moderators. (Staff have final say in the community)
            - Ask to become a staff member.

            Note:

            - Our staff members are a group of people selected by our Management Team. They have been chosen for their competences, commitment and decision-making capacity.
            - Our staff are allowed to warn/mute/kick/ban even if you knew you did not break a rule. We are not in charge of keeping you up to date on rules.
                `)
        retard.setFooter({ text: "PhantomHQ Network» Information Page", iconURL: "https://cdn.discordapp.com/attachments/869323629467426907/1037817473313013840/cUntitled-1.png"})
        return interaction.editReply({ embeds: [ retard ] });
    };
    if (interaction.customId === "informationPanelSocialMedia") {
        await interaction.deferReply({ ephemeral: true });
        const retard = new MessageEmbed()
            retard.setColor("#2f3136")
            retard.setTitle("Our Social Media 📱")
            retard.setDescription(`
            Below you can find our social media.

            <:twitter:1037824278927773798> Twitter: https://twitter.com/PlayPhantomHQClub
            :globe_with_meridians: Website: https://phantomhq.club/
                `)
        retard.setFooter({ text: "PhantomHQ Network» Information Page", iconURL: "https://cdn.discordapp.com/attachments/869323629467426907/1037817473313013840/cUntitled-1.png"})
        return interaction.editReply({ embeds: [ retard ] });
    };
    if (interaction.customId === "informationPanelApplications") {
        await interaction.deferReply({ ephemeral: true });
        const retard = new MessageEmbed()
            retard.setColor("#2f3136")
            retard.setTitle("Applications 📝")
            retard.setDescription(`
            Looking to apply?

            Please create a ticket if you wish to apply for staff or media.
                `)
        retard.setFooter({ text: "PhantomHQ Network» Information Page", iconURL: "https://cdn.discordapp.com/attachments/869323629467426907/1037817473313013840/cUntitled-1.png"})
        return interaction.editReply({ embeds: [ retard ] });
    };
    if (interaction.customId === "informationPanelFAQ") {
        await interaction.deferReply({ ephemeral: true });
        const retard = new MessageEmbed()
            retard.setColor("#2f3136")
            retard.setTitle("Frequently Asked Questions 💬")
            retard.setDescription(`

            Q: Tell me about Content Creators.
            A: On PhantomHQ we are always looking for new growing youtubers to record/ stream on the server. At the moment there are our regular Content Creators, which you have to apply for on our forums. There are set requirements that a person must meet before they are accepted to become a Content Creator on the server.

            Q: Tell me about Partnerships.
            A: Apart from Content Creators, we also have the option to partner with our server. Youtubers are either contacted directly behind the scenes, or someone is more than welcome to contact us if they are interested in partnering with our server. Just like Content Creators, we are always looking for new people to partner up with our server to make it one of the best that it can be!
           
            **Rank Transfer Policy:**

            As of 2.0 we will no longer be transferring player items and/ or ranks to new accounts under any circumstances. Your account is NOT our responsibility. If something happens, that is on you to figure it out.

            • Your account gets locked, your fault. Buy your own account next time. Mojang will unlock it if you have the TID.
            • Your account gets hacked. Learn to change your password and set stronger passwords. Buy your own account, Mojang will sort it out if you have the TID.
            • If you are being targeted in the community and can't play on your account for any reason. We will not be transferring your ranks or items to a new accoun
                `)
        retard.setFooter({ text: "PhantomHQ Network» Information Page", iconURL: "https://cdn.discordapp.com/attachments/869323629467426907/1037817473313013840/cUntitled-1.png"})
        return interaction.editReply({ embeds: [ retard ] });
    };
});

client.on("guildMemberAdd", async (mem) => {
    if (!mem.guild) return;
    const staffServer = await client.db.get(`roles.staff`);
    const publicServer = await client.db.get(`roles.public`);
    const filterOptions = require("./resource/filter");

    if (mem.guild.id !== publicServer) return;

    const embed = new MessageEmbed()
        .setColor("RED")
        .setTitle("Welcome 👋")
        .setDescription(`A new member! Say hello to ${mem}!`)
        .addField(`We hope you enjoy your time!`)
        .setFooter({ text: "PhantomHQ Network» Information Page", iconURL: "https://cdn.discordapp.com/attachments/869323629467426907/1037817473313013840/cUntitled-1.png"})

    await mem.guild.channels.cache.get("1033883181302161448").send({ embeds: [embed] })
});


(async function () {
    await postCommands();
    await client.login(config.discord.clientToken);
})();
