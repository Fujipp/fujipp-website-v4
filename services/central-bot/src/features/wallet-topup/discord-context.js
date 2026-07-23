function avatarUrl(user) {
  if (!user || typeof user.displayAvatarURL !== 'function') return '';
  return user.displayAvatarURL({ extension: 'webp', size: 160 });
}

function discordContext(source, memberOverride = null) {
  const member = memberOverride || source?.user || source?.author || null;
  const guild = source?.guild || null;
  const channel = source?.channel || null;
  const bot = source?.client?.user || guild?.members?.me?.user || null;

  return {
    member: member?.id || '',
    member_id: member?.id || '',
    member_mention: member?.id ? `<@${member.id}>` : '',
    member_username: member?.username || '',
    member_display_name: member?.globalName || member?.displayName || member?.username || '',
    member_avatar_url: avatarUrl(member),
    avatar_url: avatarUrl(member),
    guild_id: source?.guildId || guild?.id || '',
    guild_name: guild?.name || '',
    channel_id: source?.channelId || channel?.id || '',
    channel_mention: (source?.channelId || channel?.id) ? `<#${source?.channelId || channel.id}>` : '',
    bot_id: bot?.id || '',
    bot_name: bot?.username || '',
    bot_avatar_url: avatarUrl(bot),
  };
}

function withDiscordContext(source, values = {}, memberOverride = null) {
  return { ...discordContext(source, memberOverride), ...values };
}

module.exports = { discordContext, withDiscordContext };
