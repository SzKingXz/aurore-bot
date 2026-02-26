const { Events, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../utils/constants');
const { getGuildConfig } = require('../db');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    const guild = member.guild;
    const config = getGuildConfig(guild.id);
    const channelId = config?.welcome_channel;
    const channel = channelId ? guild.channels.cache.get(channelId) : guild.systemChannel || guild.channels.cache.find(c => c.name.includes('general') && c.isTextBased());
    if (!channel) return;
    const desc = `Bienvenid@ al servidor, ${member}.\n\nYa somos **${guild.memberCount}** miembros.`;
    const embed = new EmbedBuilder()
      .setColor(PALETTE.primary)
      .setTitle('NUEVO MIEMBRO')
      .setDescription(desc)
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: 'AURORE SYSTEM', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    channel.send({ embeds: [embed] }).catch(() => {});
  }
};
