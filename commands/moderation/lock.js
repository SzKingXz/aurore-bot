const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { PALETTE } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Bloquea el canal')
    .addStringOption(opt => opt
      .setName('razon')
      .setDescription('Razón del bloqueo')),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageChannels')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    
    const razon = interaction.options.getString('razon') || 'Sin especificar';
    const everyone = interaction.guild.roles.everyone;
    
    await interaction.channel.permissionOverwrites.edit(everyone, {
      SendMessages: false
    }, { reason: razon });
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.error)
      .setTitle('✦ CANAL BLOQUEADO')
      .setDescription(`Razón: ${razon}`)
      .setFooter({ text: 'AURORE SYSTEM' });
    
    interaction.reply({ embeds: [embed] });
  }
};
