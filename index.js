const { Client, GatewayIntentBits, ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

require('dotenv').config();

// Store temporary channels and their owners
const tempChannels = new Map();
const channelOwners = new Map();
const creationChannels = new Set();

client.once('ready', () => {
    console.log(`🔥 RED EYE is online as ${client.user.tag}!`);
    console.log('🎯 Temporary Voice Channels System Activated!');
    
    // Set RED EYE bot status
    client.user.setActivity('.v help | RED EYE', { type: 'WATCHING' });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('.v ')) return;

    const args = message.content.slice(3).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Check if user is in a voice channel
    const voiceChannel = message.member.voice.channel;
    
    if (!voiceChannel) {
        return message.reply('❌ You must be in a voice channel to use RED EYE commands!');
    }

    // Check if user owns the channel or it's a temp channel
    if (!tempChannels.has(voiceChannel.id) || channelOwners.get(voiceChannel.id) !== message.author.id) {
        return message.reply('❌ You can only manage RED EYE channels you created!');
    }

    try {
        switch (command) {
            case 'name':
            case 'rename':
                await renameChannel(message, args.join(' '), voiceChannel);
                break;

            case 'lock':
                await lockChannel(message, voiceChannel);
                break;

            case 'unlock':
                await unlockChannel(message, voiceChannel);
                break;

            case 'limit':
                await setLimit(message, parseInt(args[0]), voiceChannel);
                break;

            case 'kick':
                await kickUser(message, args[0], voiceChannel);
                break;

            case 'ban':
                await banUser(message, args[0], voiceChannel);
                break;

            case 'unban':
                await unbanUser(message, args[0], voiceChannel);
                break;

            case 'permit':
                await permitUser(message, args[0], voiceChannel);
                break;

            case 'unpermit':
                await unpermitUser(message, args[0], voiceChannel);
                break;

            case 'claim':
                await claimChannel(message, voiceChannel);
                break;

            case 'transfer':
                await transferChannel(message, args[0], voiceChannel);
                break;

            case 'info':
                await channelInfo(message, voiceChannel);
                break;

            case 'help':
                await showHelp(message);
                break;

            default:
                await message.reply('❌ Unknown RED EYE command! Use `.v help` for available commands.');
        }
    } catch (error) {
        console.error('RED EYE Error:', error);
        await message.reply('❌ RED EYE encountered an error while executing the command!');
    }
});

// Voice channel management functions
async function renameChannel(message, newName, voiceChannel) {
    if (!newName) {
        return message.reply('❌ Please provide a new name! Usage: `.v name New Channel Name`');
    }

    if (newName.length > 100) {
        return message.reply('❌ Channel name must be less than 100 characters!');
    }

    await voiceChannel.setName(newName);
    await message.reply(`✅ RED EYE renamed channel to: **${newName}**`);
}

async function lockChannel(message, voiceChannel) {
    await voiceChannel.permissionOverwrites.edit(message.guild.roles.everyone, {
        Connect: false
    });
    await message.reply('🔒 RED EYE locked the channel! Only permitted users can join.');
}

async function unlockChannel(message, voiceChannel) {
    await voiceChannel.permissionOverwrites.edit(message.guild.roles.everyone, {
        Connect: null
    });
    await message.reply('🔓 RED EYE unlocked the channel! Everyone can join.');
}

async function setLimit(message, limit, voiceChannel) {
    if (!limit || limit < 0 || limit > 99) {
        return message.reply('❌ Please provide a valid limit between 1-99! Usage: `.v limit 5`');
    }

    await voiceChannel.setUserLimit(limit);
    await message.reply(`✅ RED EYE set user limit to: **${limit}**`);
}

async function kickUser(message, userMention, voiceChannel) {
    if (!userMention) {
        return message.reply('❌ Please mention a user to kick! Usage: `.v kick @username`');
    }

    const userId = userMention.replace(/[<@!>]/g, '');
    const member = await message.guild.members.fetch(userId).catch(() => null);
    
    if (!member) {
        return message.reply('❌ User not found!');
    }

    if (!member.voice.channel || member.voice.channel.id !== voiceChannel.id) {
        return message.reply('❌ User is not in your RED EYE channel!');
    }

    await member.voice.disconnect();
    await message.reply(`✅ RED EYE kicked **${member.user.tag}** from the channel!`);
}

async function banUser(message, userMention, voiceChannel) {
    if (!userMention) {
        return message.reply('❌ Please mention a user to ban! Usage: `.v ban @username`');
    }

    const userId = userMention.replace(/[<@!>]/g, '');
    
    await voiceChannel.permissionOverwrites.edit(userId, {
        Connect: false
    });
    
    await message.reply(`✅ RED EYE banned user from joining the channel!`);
}

async function unbanUser(message, userMention, voiceChannel) {
    if (!userMention) {
        return message.reply('❌ Please mention a user to unban! Usage: `.v unban @username`');
    }

    const userId = userMention.replace(/[<@!>]/g, '');
    
    await voiceChannel.permissionOverwrites.delete(userId);
    await message.reply(`✅ RED EYE unbanned user from the channel!`);
}

async function permitUser(message, userMention, voiceChannel) {
    if (!userMention) {
        return message.reply('❌ Please mention a user to permit! Usage: `.v permit @username`');
    }

    const userId = userMention.replace(/[<@!>]/g, '');
    
    await voiceChannel.permissionOverwrites.edit(userId, {
        Connect: true
    });
    
    await message.reply(`✅ RED EYE permitted user to join the locked channel!`);
}

async function unpermitUser(message, userMention, voiceChannel) {
    if (!userMention) {
        return message.reply('❌ Please mention a user to unpermit! Usage: `.v unpermit @username`');
    }

    const userId = userMention.replace(/[<@!>]/g, '');
    
    await voiceChannel.permissionOverwrites.delete(userId);
    await message.reply(`✅ RED EYE removed user's special permissions!`);
}

async function claimChannel(message, voiceChannel) {
    const currentOwnerId = channelOwners.get(voiceChannel.id);
    const currentOwner = await message.guild.members.fetch(currentOwnerId).catch(() => null);
    
    // If original owner left the channel or server
    if (!currentOwner || !currentOwner.voice.channel || currentOwner.voice.channel.id !== voiceChannel.id) {
        channelOwners.set(voiceChannel.id, message.author.id);
        await message.reply('✅ RED EYE transferred ownership to you!');
    } else {
        await message.reply('❌ The original owner is still in the channel!');
    }
}

async function transferChannel(message, userMention, voiceChannel) {
    if (!userMention) {
        return message.reply('❌ Please mention a user to transfer ownership! Usage: `.v transfer @username`');
    }

    const userId = userMention.replace(/[<@!>]/g, '');
    const newOwner = await message.guild.members.fetch(userId).catch(() => null);
    
    if (!newOwner) {
        return message.reply('❌ User not found!');
    }

    channelOwners.set(voiceChannel.id, userId);
    await message.reply(`✅ RED EYE transferred channel ownership to **${newOwner.user.tag}**!`);
}

async function channelInfo(message, voiceChannel) {
    const ownerId = channelOwners.get(voiceChannel.id);
    const owner = await message.guild.members.fetch(ownerId).catch(() => null);
    
    const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`🔥 RED EYE - Channel Info: ${voiceChannel.name}`)
        .addFields(
            { name: '👑 Owner', value: owner ? owner.user.tag : 'Unknown', inline: true },
            { name: '👥 Members', value: `${voiceChannel.members.size}/${voiceChannel.userLimit || 'Unlimited'}`, inline: true },
            { name: '🔒 Status', value: voiceChannel.permissionsFor(message.guild.roles.everyone).has('Connect') ? 'Unlocked' : 'Locked', inline: true },
            { name: '📅 Created', value: `<t:${Math.floor(voiceChannel.createdTimestamp / 1000)}:R>`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'RED EYE Voice Channel System' });

    await message.reply({ embeds: [embed] });
}

async function showHelp(message) {
    const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🔥 RED EYE - Voice Channel Manager')
        .setDescription('Take control of your temporary voice channels with RED EYE commands:')
        .addFields(
            {
                name: '🔄 Channel Management',
                value: '`.v name [name]` - Rename channel\n`.v lock` - Lock channel\n`.v unlock` - Unlock channel\n`.v limit [number]` - Set user limit'
            },
            {
                name: '👥 User Management',
                value: '`.v kick @user` - Kick user\n`.v ban @user` - Ban user\n`.v unban @user` - Unban user\n`.v permit @user` - Permit user\n`.v unpermit @user` - Unpermit user'
            },
            {
                name: '👑 Ownership',
                value: '`.v claim` - Claim ownership\n`.v transfer @user` - Transfer ownership\n`.v info` - Channel info'
            },
            {
                name: '❓ Help',
                value: '`.v help` - Show this help message'
            }
        )
        .setTimestamp()
        .setFooter({ text: 'RED EYE - You must be the channel owner to use these commands!' });

    await message.reply({ embeds: [embed] });
}

// Auto-create RED EYE temporary channels when joining specific channels
client.on('voiceStateUpdate', async (oldState, newState) => {
    // User joined a voice channel
    if (newState.channel && !oldState.channel) {
        // Check if this is a "create channel" channel
        if (creationChannels.has(newState.channel.id)) {
            await createUserChannel(newState);
        }
    }

    // User left a voice channel
    if (oldState.channel && !newState.channel) {
        await checkEmptyChannel(oldState.channel);
    }

    // User switched channels
    if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        await checkEmptyChannel(oldState.channel);
        
        if (creationChannels.has(newState.channel.id)) {
            await createUserChannel(newState);
        }
    }
});

async function createUserChannel(voiceState) {
    const member = voiceState.member;
    const category = voiceState.channel.parent;

    const newChannel = await voiceState.guild.channels.create({
        name: `🔴 ${member.user.username}'s Room`,
        type: ChannelType.GuildVoice,
        parent: category,
        userLimit: 0,
        permissionOverwrites: [
            {
                id: member.id,
                allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers]
            },
            {
                id: voiceState.guild.roles.everyone,
                allow: [PermissionsBitField.Flags.Connect]
            }
        ]
    });

    // Move user to new channel
    await member.voice.setChannel(newChannel);

    // Store channel info
    tempChannels.set(newChannel.id, true);
    channelOwners.set(newChannel.id, member.id);

    console.log(`🔥 RED EYE created channel: ${newChannel.name} for ${member.user.tag}`);
}

async function checkEmptyChannel(channel) {
    if (tempChannels.has(channel.id) && channel.members.size === 0) {
        // Wait 10 seconds before deleting to avoid rapid channel creation/deletion
        setTimeout(async () => {
            const refreshedChannel = await channel.guild.channels.fetch(channel.id).catch(() => null);
            if (refreshedChannel && refreshedChannel.members.size === 0) {
                await refreshedChannel.delete().catch(console.error);
                tempChannels.delete(channel.id);
                channelOwners.delete(channel.id);
                console.log(`🔥 RED EYE deleted empty channel: ${refreshedChannel.name}`);
            }
        }, 10000);
    }
}

// Setup command to create "join to create" channels
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // Admin-only setup command
    if (message.content.startsWith('.v setup') && message.member.permissions.has('Administrator')) {
        const channel = await message.guild.channels.create({
            name: '🔴 RED EYE - Create Room',
            type: ChannelType.GuildVoice,
            parent: message.channel.parent
        });

        creationChannels.add(channel.id);
        
        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🔥 RED EYE Setup Complete!')
            .setDescription(`Join **${channel.name}** to create your own temporary voice channel.`)
            .addFields(
                { name: 'Available Commands', value: 'Use `.v help` in any text channel to see all RED EYE commands' },
                { name: 'How It Works', value: '1. Join the creation channel\n2. Get moved to your personal room\n3. Use `.v` commands to manage it' }
            )
            .setTimestamp()
            .setFooter({ text: 'RED EYE Voice Channel System' });

        await message.reply({ embeds: [embed] });
    }
});

client.login(process.env.DISCORD_TOKEN);