module.exports = {
    discord: {
        clientID: "ClientID", // The client ID of this Hynax instance
        clientToken: "Token", // The Discord bot token for Hynax
        status: { // Setting either or both to null will set it to default
            type: null, // The type of status prefix
            content: null // The content of the status
        },
        channels: {
            tickets: {
                transcripts: "ChannelID", // The channel ID of the transcripts channel
                category: "CategoryID" // The category ID of the tickets category
            },
            suggestions: {
                channel: "ChannelID" // The channel ID where suggestions will be put into
            }
        },
        roles: {
            public: {
                staff: "RoleID", // The role ID of the public staff role
            }
        }
    },
    databases: {
        url: "redis://127.0.0.1:27017/",
        // Supports Mongo out of the box
        // Leaving it blank will use in-memory Keyv, however all data will clear after stopping Hynax.
        // Support for MySQL, Postgres, and many other databases are available. As long as it's supported by Keyv, you can use it.
        // Third party database adapters are unsupported, however, and are not guaranteed to work.
        namespace: "hynax" // The Keyv namespace to use
    },
    proctors: ["USERID"] // User IDs of the Discord users who will serve as the "proctors", or administrators, of the bot
};