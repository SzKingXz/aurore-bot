const { Events, EmbedBuilder } = require('discord.js');
const { PALETTE, SPAM_CONFIG }  = require('../utils/constants');
const { checkSpam, formatNumber } = require('../utils/helpers');
const { XP_CONFIG, addXP, canGainXP, getUserData, getGuildConfig, logMod } = require('../db');
const { sendModLog, assignLevelRole } = require('../utils/modLog');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const { id: userId, username } = message.author;
    const guildId = message.guild.id;

    if (checkSpam(userId, guildId, SPAM_CONFIG)) {
      const member = await message.guild.members.fetch(userId).catch(() => null);
      if (member?.moderatable) {
        const ms  = SPAM_CONFIG.TIMEOUT_MIN * 60 * 1000;
        const msg = `Anti-spam automático — ${SPAM_CONFIG.TIMEOUT_MIN}min`;
        await member.timeout(ms, msg).catch(() => {});
        logMod(guildId, 'timeout', userId, client.user.id, msg);

        const embed = new EmbedBuilder()
          .setColor(PALETTE.error)
          .setTitle('ANTI-SPAM')
          .setDescription(`${message.author} fue silenciado automáticamente.`)
          .addFields({ name: 'Duración', value: `${SPAM_CONFIG.TIMEOUT_MIN} minutos`, inline: true })
          .setFooter({ text: 'AURORE', iconURL: client.user.displayAvatarURL() })
          .setTimestamp();

        await sendModLog(message.guild, embed);
        await message.channel.send({ embeds: [embed] }).catch(() => {});
      }
      return;
    }

    if (!canGainXP(userId, guildId)) return;

    const { min, max } = XP_CONFIG.xpPerMessage;
    const xpGained = Math.floor(Math.random() * (max - min + 1)) + min;
    const result   = addXP(userId, guildId, xpGained, username);

    if (!result.leveledUp) return;

    const userData = getUserData(userId, guildId);
    const config   = getGuildConfig(guildId);

    client.broadcast?.(guildId, {
      type:     'level_up',
      guildId:  String(guildId),
      userId:   String(userId),
      username,
      newLevel: result.newLevel,
      message:  `${username} alcanzó el nivel ${result.newLevel}`,
      ts:       Date.now(),
    });

    const member = await message.guild.members.fetch(userId).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(PALETTE.primary)
      .setTitle('SUBISTE DE NIVEL')
      .setDescription(`${message.author} alcanzó el **Nivel ${result.newLevel}**`)
      .addFields(
        { name: 'Nivel',    value: `${result.newLevel}`,               inline: true },
        { name: 'XP',       value: formatNumber(result.newXP),         inline: true },
        { name: 'Mensajes', value: formatNumber(userData.messages),     inline: true },
      )
      .setThumbnail(message.author.displayAvatarURL())
      .setFooter({ text: 'AURORE', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    const ch = config?.level_channel
      ? message.guild.channels.cache.get(config.level_channel)
      : message.channel;

    if (ch) ch.send({ embeds: [embed] }).catch(() => {});
    if (member) await assignLevelRole(member, message.guild, result.newLevel);
  },
};
