const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { logMod } = require('../../db');
const { sendModLog } = require('../../utils/modLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Silencia temporalmente a un usuario')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a silenciar').setRequired(true))
    .addIntegerOption(opt => opt.setName('minutos').setDescription('Duración (1–10080 min)').setRequired(true).setMinValue(1).setMaxValue(10080))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón del timeout')),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ModerateMembers')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    const user    = interaction.options.getUser('usuario');
    const minutos = interaction.options.getInteger('minutos');
    const razon   = interaction.options.getString('razon') || 'Sin especificar';
    const member  = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member)          return interaction.reply({ content: '❌ Usuario no encontrado.', ephemeral: true });
    if (!member.moderatable) return interaction.reply({ content: '❌ No puedo silenciar a ese usuario.', ephemeral: true });

    try { await member.timeout(minutos * 60_000, razon); }
    catch { return interaction.reply({ content: '❌ No pude aplicar el timeout.', ephemeral: true }); }

    logMod(interaction.guildId, 'timeout', user.id, interaction.user.id, `${minutos}min — ${razon}`);
    interaction.client.broadcast?.(interaction.guildId, {
      type: 'mod_action', guildId: String(interaction.guildId),
      action: 'timeout', userId: user.id, moderatorId: interaction.user.id,
      message: `${user.username} silenciado ${minutos}min — ${razon}`, ts: Date.now(),
    });

    const embed = new EmbedBuilder()
      .setColor(PALETTE.error)
      .setTitle('TIMEOUT')
      .setDescription(`${user} fue silenciado.`)
      .addFields(
        { name: 'Duración', value: `${minutos} minuto${minutos !== 1 ? 's' : ''}`, inline: true },
        { name: 'Razón',    value: razon, inline: true },
      )
      .setFooter({ text: 'AURORE SYSTEM' })
      .setTimestamp();

    await sendModLog(interaction.guild, embed);
    interaction.reply({ embeds: [embed] });
  },
};
