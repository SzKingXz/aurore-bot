const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { logMod } = require('../../db');
const { sendModLog } = require('../../utils/modLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa a un usuario')
    .addUserOption(opt => opt
      .setName('usuario')
      .setDescription('Usuario a expulsar')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('razon')
      .setDescription('Razón de la expulsión')),
  async execute(interaction) {
    if (!interaction.member.permissions.has('KickMembers')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    
    const user = interaction.options.getUser('usuario');
    const razon = interaction.options.getString('razon') || 'Sin especificar';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    
    if (!member) return interaction.reply({ content: '❌ Usuario no encontrado.', ephemeral: true });
    if (!member.kickable) return interaction.reply({ content: '❌ No puedo expulsar a este usuario.', ephemeral: true });
    
    await member.kick(razon);
    logMod(interaction.guildId, 'kick', user.id, interaction.user.id, razon);
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.error)
      .setTitle('✦ EXPULSIÓN')
      .setDescription(`${user} fue expulsado`)
      .addFields({ name: 'Razón', value: razon })
      .setFooter({ text: 'AURORE SYSTEM' });
    
    await sendModLog(interaction.guild, embed);
    interaction.reply({ embeds: [embed] });
  }
};
