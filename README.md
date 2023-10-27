# Hynax Discord Bot - All In One Discord Bot

## Introduction

Hynax was orginally developed for my old server called MineRIP and was worked on by me and my friend Dani. The reason I am open sourcing this project is because there is a better version that is improved and has a better code base and is in Typescript with better practices. Anyways, Hynax is an open-source Discord bot built using Discord.js. It offers a wide range of features including announcements, verification, information panels, polls, moderation, automoderation, message purging, reaction roles, reporting, and a ticket system. While many aspects of the bot are hard-coded, you are encouraged to make pull requests (PRs) to make certain features configurable to suit your server's needs.

## Original Authors

Hynax was created and is actively maintained by me (Emily) and [Dani](https://github.com/daniwasonline/).

## Getting Started...

To use the Hynax bot, follow these steps:

1. Clone the repository to your local machine.

2. Install Dependecies.
- Hynax requires Node.js 16+ to run. You can install the required dependencies using Yarn or npm. Yarn is preferred for its speed and efficiency. To install dependencies using Yarn, run the following command:
`yarn install`

3. Invite Hynax to your server:
- Use the InviteManager to add the bot to your server by typing: `invitemanager add <id>`. This will grant the bot permission to operate within your server.

4. Set Up Public Guild ID:
- Use the `srolemanager` command to set the public guild ID to a public one. This will help the bot identify and interact with your server effectively.

5. Setup Database:
- Hynax supports MongoDB out of the box. You need to ensure that MongoDB is installed and properly configured for the bot to store and manage data. You can also configure other databases like MySQL, Postgres, and others, as long as they are supported by Keyv. Leaving the database configuration blank will use in-memory Keyv, but keep in mind that all data will be cleared after stopping Hynax.

**Note:** Third-party database adapters are unsupported and not guaranteed to work.

6. Configure Hynax:
- Hynax can be configured by modifying the config.js or config.example.js and putting in the details you desire.

7. Starting the Bot:
- To start the bot, execute the following command:
`yarn run start` or `npm run start`

## Features

Announcements

    Hynax can make announcements in your server.

Verification

    Set up a verification system for your server.

Information Panels

    Display various server information panels.

Polls

    Create polls for your server members to vote on.

Moderation

    Hynax offers moderation features to help keep your server clean and safe.

Automoderation

    Automate certain moderation tasks for your server.

Message Purging

    Easily delete messages in your server.

Reaction Roles

    Assign roles to members based on their reactions to messages.

Reporting

    Implement a reporting system to handle user reports.

Other Panels

    Access other panels and features for your server.

Ticket System

    Create a ticket system for support and assistance.

Suggestions

    Gather suggestions from your server members.

## Contributing
You are welcome to contribute to the development of Hynax by making pull requests to make certain features configurable and to improve the functionality of the bot.

## Support
If you encounter any issues, need help, or have questions, please refer to the project's GitHub repository for documentation and support. Or you can always add me on discord: @ohemilyy

## License
Hynax is licensed under the GNU GENERAL PUBLIC License. See the LICENSE file for more information.


I appreciate your interest in Hynax, I we hope this documentation helps you get started with the bot and its features. Feel free to contribute and make the bot even better for the Discord community.

