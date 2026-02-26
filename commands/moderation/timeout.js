const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { logMod } = require('../../db');
const { sendModLog } = require('../../utils/modLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Silencia a un usuario temporalmente')
    .addUserOption(opt => opt
      .setName('usuario')
      .setDescription('Usuario a silenciar')
      .setRequired(true))
    .addIntegerOption(opt => opt
      .setName('minutos')
      .setDescription('Duración en minutos (1-10080)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(10080))
    .addStringOption(opt => opt
      .setName('razon')
      .setDescription('Razón del timeout')),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ModerateMembers')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    
    const user = interaction.options.getUser('usuario');
    const minutos = interaction.options.getInteger('minutos');
    const razon = interaction.options.getString('razon') || 'Sin especificar';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    
    if (!member) return interaction.reply({ content: '❌ Usuario no encontrado.', ephemeral: true });
    if (!member.moderatable) return interaction.reply({ content: '❌ No puedo silenciar a este usuario.', ephemeral: true });
    
    await member.timeout(minutos * 60000, razon);
    logMod(interaction.guildId, 'timeout', user.id, interaction.user.id, `${minutos}min - ${razon}`);
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.error)
      .setTitle('✦ TIMEOUT')
      .setDescription(`${user} fue silenciado`)
      .addFields({ name: 'Duración', value: `${minutos} minutos` }, { name: 'Razón', value: razon })
      .setFooter({ text: 'AURORE SYSTEM' });
    
    await sendModLog(interaction.guild, embed);
    interaction.reply({ embeds: [embed] });
  }
};
