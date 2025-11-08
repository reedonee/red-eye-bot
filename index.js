const { Client, GatewayIntentBits, ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');

// Debug logging
console.log('🚀 RED EYE Fixed Version Starting...');
console.log('🔧 Token exists:', !!process.env.DISCORD_TOKEN);
console.log('🔧 Environment:', process.env.NODE_ENV || 'development');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Store temporary channels and their owners
const tempChannels = new Map();
const channelOwners = new Map();
const creationChannels = new Set();

client.once('ready', () => {
    console.log(`🔥 RED EYE is online as ${client.user.tag}!`);
    console.log('🎯 Temporary Voice Channels System Activated!');
    
    client.user.setActivity('.v help | RED EYE', { type: 'WATCHING' });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('.v ')) return;

    const args = message.content.slice(3).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    const voiceChannel = message.member.voice.channel;
    
    if (!voiceChannel) {
        return message.reply('❌ You must be in a voice channel to use RED EYE commands!');
    }

    if (!tempChannels.has(voiceChannel.id) || channelOwners.get(voiceChannel.id) !== message.author.id) {
        return message.reply('❌ You can only manage RED EYE channels you created!');
    }

    try {
        switch (command) {
            case 'name':
            case 'rename':
                if (!args[0]) return message.reply('❌ Please provide a new name!');
                await voiceChannel.setName(args.join(' '));
                await message.reply(`✅ RED EYE renamed channel to: **${args.join(' ')}**`);
                break;

            case 'lock':
                await voiceChannel.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: false });
                await message.reply('🔒 RED EYE locked the channel!');
                break;

            case 'unlock':
                await voiceChannel.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: null });
                await message.reply('🔓 RED EYE unlocked the channel!');
                break;

            case 'limit':
                const limit = parseInt(args[0]);
                if (!limit || limit < 0 || limit > 99) return message.reply('❌ Please provide a valid limit 1-99!');
                await voiceChannel.setUserLimit(limit);
                await message.reply(`✅ RED EYE set user limit to: **${limit}**`);
                break;

            case 'kick':
                if (!args[0]) return message.reply('❌ Please mention a user!');
                const userId = args[0].replace(/[<@!>]/g, '');
                const member = await message.guild.members.fetch(userId).catch(() => null);
                if (!member || !member.voice.channel || member.voice.channel.id !== voiceChannel.id) {
                    return message.reply('❌ User not found in your channel!');
                }
                await member.voice.disconnect();
                await message.reply(`✅ RED EYE kicked **${member.user.tag}**!`);
                break;

            case 'ban':
                if (!args[0]) return message.reply('❌ Please mention a user!');
                const banUserId = args[0].replace(/[<@!>]/g, '');
                await voiceChannel.permissionOverwrites.edit(banUserId, { Connect: false });
                await message.reply(`✅ RED EYE banned user!`);
                break;

            case 'unban':
                if (!args[0]) return message.reply('❌ Please mention a user!');
                const unbanUserId = args[0].replace(/[<@!>]/g, '');
                await voiceChannel.permissionOverwrites.delete(unbanUserId);
                await message.reply(`✅ RED EYE unbanned user!`);
                break;

            case 'claim':
                const currentOwnerId = channelOwners.get(voiceChannel.id);
                const currentOwner = await message.guild.members.fetch(currentOwnerId).catch(() => null);
                if (!currentOwner || !currentOwner.voice.channel || currentOwner.voice.channel.id !== voiceChannel.id) {
                    channelOwners.set(voiceChannel.id, message.author.id);
                    await message.reply('✅ RED EYE transferred ownership to you!');
                } else {
                    await message.reply('❌ Original owner still in channel!');
                }
                break;

            case 'info':
                const ownerId = channelOwners.get(voiceChannel.id);
                const owner = await message.guild.members.fetch(ownerId).catch(() => null);
                const embed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle(`🔥 RED EYE - ${voiceChannel.name}`)
                    .addFields(
                        { name: '👑 Owner', value: owner ? owner.user.tag : 'Unknown', inline: true },
                        { name: '👥 Members', value: `${voiceChannel.members.size}/${voiceChannel.userLimit || 'Unlimited'}`, inline: true },
                        { name: '🔒 Status', value: voiceChannel.permissionsFor(message.guild.roles.everyone).has('Connect') ? 'Unlocked' : 'Locked', inline: true }
                    )
                    .setFooter({ text: 'RED EYE Voice System' });
                await message.reply({ embeds: [embed] });
                break;

            case 'help':
                const helpEmbed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('🔥 RED EYE Commands')
                    .setDescription('**Channel Management:**\n`.v name [name]` - Rename\n`.v lock/unlock` - Lock channel\n`.v limit [1-99]` - Set limit\n\n**User Management:**\n`.v kick @user` - Kick user\n`.v ban/unban @user` - Ban user\n\n**Other:**\n`.v claim` - Take ownership\n`.v info` - Channel info')
                    .setFooter({ text: 'Join creation channel to get started!' });
                await message.reply({ embeds: [helpEmbed] });
                break;

            default:
                await message.reply('❌ Unknown command! Use `.v help`');
        }
    } catch (error) {
        console.error('Command error:', error);
        await message.reply('❌ Command failed!');
    }
});

// Auto-create channels
client.on('voiceStateUpdate', async (oldState, newState) => {
    // User joined creation channel
    if (newState.channel && creationChannels.has(newState.channel.id)) {
        await createUserChannel(newState);
    }

    // User left a temp channel
    if (oldState.channel && tempChannels.has(oldState.channel.id) && oldState.channel.members.size === 0) {
        setTimeout(async () => {
            const channel = await oldState.guild.channels.fetch(oldState.channel.id).catch(() => null);
            if (channel && channel.members.size === 0) {
                await channel.delete().catch(console.error);
                tempChannels.delete(channel.id);
                channelOwners.delete(channel.id);
                console.log(`🔥 RED EYE deleted empty channel: ${channel.name}`);
            }
        }, 10000);
    }
});

async function createUserChannel(voiceState) {
    try {
        const member = voiceState.member;
        const newChannel = await voiceState.guild.channels.create({
            name: `🔴 ${member.user.username}'s Room`,
            type: ChannelType.GuildVoice,
            parent: voiceState.channel.parent,
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

        await member.voice.setChannel(newChannel);
        tempChannels.set(newChannel.id, true);
        channelOwners.set(newChannel.id, member.id);
        console.log(`🔥 RED EYE created channel for ${member.user.tag}`);
    } catch (error) {
        console.error('Create channel error:', error);
    }
}

// Setup command
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.content === '.v setup' && message.member.permissions.has('Administrator')) {
        try {
            const channel = await message.guild.channels.create({
                name: '🔴 RED EYE - Create Room',
                type: ChannelType.GuildVoice,
                parent: message.channel.parent
            });

            creationChannels.add(channel.id);
            await message.reply('✅ RED EYE setup complete! Join the creation channel to get started.');
        } catch (error) {
            console.error('Setup error:', error);
            await message.reply('❌ Setup failed!');
        }
    }
});

// Handle token errors gracefully
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

// Login with token
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ CRITICAL: No Discord token found!');
    console.error('Please set DISCORD_TOKEN environment variable');
    process.exit(1);
}

client.login(token).catch(error => {
    console.error('❌ Login failed:', error.message);
    process.exit(1);
});