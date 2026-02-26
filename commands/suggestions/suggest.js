const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { getGuildConfig } = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Envía una sugerencia')
    .addStringOption(opt => opt
      .setName('sugerencia')
      .setDescription('Tu sugerencia')
      .setRequired(true)),
  async execute(interaction) {
    const sugerencia = interaction.options.getString('sugerencia');
    const config = getGuildConfig(interaction.guildId);
    if (!config?.suggest_channel) {
      return interaction.reply({ content: '❌ No hay canal de sugerencias configurado.', ephemeral: true });
    }
    
    const channel = interaction.guild.channels.cache.get(config.suggest_channel);
    if (!channel) {
      return interaction.reply({ content: '❌ Canal de sugerencias no encontrado.', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.cyan)
      .setTitle('✦ SUGERENCIA')
      .setDescription(sugerencia)
      .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
      .setFooter({ text: 'AURORE SYSTEM' });
    
    const msg = await channel.send({ embeds: [embed] });
    await msg.react('👍').catch(() => {});
    await msg.react('👎').catch(() => {});
    
    interaction.reply({ content: '✅ Sugerencia enviada.', ephemeral: true });
  }
};
