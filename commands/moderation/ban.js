const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { logMod } = require('../../db');
const { sendModLog } = require('../../utils/modLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Baneo a un usuario')
    .addUserOption(opt => opt
      .setName('usuario')
      .setDescription('Usuario a banear')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('razon')
      .setDescription('Razón del baneo'))
    .addIntegerOption(opt => opt
      .setName('dias')
      .setDescription('Días de historial a eliminar')
      .setMinValue(0)
      .setMaxValue(7)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('BanMembers')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    
    const user = interaction.options.getUser('usuario');
    const razon = interaction.options.getString('razon') || 'Sin especificar';
    const dias = interaction.options.getInteger('dias') || 0;
    
    await interaction.guild.members.ban(user, { deleteMessageDays: dias, reason: razon });
    logMod(interaction.guildId, 'ban', user.id, interaction.user.id, razon);
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.error)
      .setTitle('✦ BANEO')
      .setDescription(`${user} fue baneado`)
      .addFields({ name: 'Razón', value: razon })
      .setFooter({ text: 'AURORE SYSTEM' });
    
    await sendModLog(interaction.guild, embed);
    interaction.reply({ embeds: [embed] });
  }
};
