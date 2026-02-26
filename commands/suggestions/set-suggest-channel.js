const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { setGuildConfig } = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-suggest-channel')
    .setDescription('Configura el canal de sugerencias')
    .addChannelOption(opt => opt
      .setName('canal')
      .setDescription('Canal para sugerencias')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildText)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    
    const canal = interaction.options.getChannel('canal');
    setGuildConfig(interaction.guildId, { suggest_channel: canal.id });
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.success)
      .setTitle('✦ CONFIGURADO')
      .setDescription(`Canal de sugerencias: ${canal}`)
      .setFooter({ text: 'AURORE SYSTEM' });
    interaction.reply({ embeds: [embed] });
  }
};
