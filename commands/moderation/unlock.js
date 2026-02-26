const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Desbloquea el canal')
    .addStringOption(opt => opt
      .setName('razon')
      .setDescription('Razón del desbloqueo')),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageChannels')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    
    const razon = interaction.options.getString('razon') || 'Sin especificar';
    const everyone = interaction.guild.roles.everyone;
    
    await interaction.channel.permissionOverwrites.edit(everyone, {
      SendMessages: null
    }, { reason: razon });
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.success)
      .setTitle('✦ CANAL DESBLOQUEADO')
      .setDescription(`Razón: ${razon}`)
      .setFooter({ text: 'AURORE SYSTEM' });
    
    interaction.reply({ embeds: [embed] });
  }
};
