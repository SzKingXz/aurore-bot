const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { getUserModerations } = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('infractions')
    .setDescription('Ver infracciones de un usuario')
    .addUserOption(opt => opt
      .setName('usuario')
      .setDescription('Usuario')
      .setRequired(true)),
  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const infracciones = getUserModerations(user.id, interaction.guildId, 10);
    
    if (infracciones.length === 0) {
      return interaction.reply({ content: `${user} no tiene infracciones.`, ephemeral: true });
    }
    
    const desc = infracciones.map((inf, i) => {
      const fecha = new Date(inf.timestamp).toLocaleDateString('es-ES');
      return `${i + 1}. **${inf.type.toUpperCase()}** - ${inf.reason} (${fecha})`;
    }).join('\n');
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.error)
      .setTitle(`✦ INFRACCIONES - ${user.username}`)
      .setDescription(desc)
      .setFooter({ text: `Total: ${infracciones.length}` });
    
    interaction.reply({ embeds: [embed] });
  }
};
