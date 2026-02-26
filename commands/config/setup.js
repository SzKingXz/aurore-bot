const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { setGuildConfig } = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configuración inicial del servidor'),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    
    await interaction.deferReply();
    
    let autoroles = interaction.guild.channels.cache.find(c => c.name === 'autoroles');
    if (!autoroles) {
      const cat = await interaction.guild.channels.create({
        name: 'autoroles',
        type: 4,
        reason: 'Configuración automática'
      });
      autoroles = cat;
    }
    
    const channelsData = {};
    setGuildConfig(interaction.guildId, channelsData);
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.success)
      .setTitle('✦ CONFIGURACIÓN COMPLETADA')
      .setDescription('El servidor ha sido configurado correctamente')
      .setFooter({ text: 'AURORE SYSTEM' });
    
    interaction.editReply({ embeds: [embed] });
  }
};
