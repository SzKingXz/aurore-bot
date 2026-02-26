const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { logMod } = require('../../db');
const { sendModLog } = require('../../utils/modLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Advierte a un usuario')
    .addUserOption(opt => opt
      .setName('usuario')
      .setDescription('Usuario a advertir')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('razon')
      .setDescription('Razón de la advertencia')),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ModerateMembers')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    
    const user = interaction.options.getUser('usuario');
    const razon = interaction.options.getString('razon') || 'Sin especificar';
    
    logMod(interaction.guildId, 'warn', user.id, interaction.user.id, razon);
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.error)
      .setTitle('✦ ADVERTENCIA')
      .setDescription(`${user} fue advertido`)
      .addFields({ name: 'Razón', value: razon })
      .setFooter({ text: 'AURORE SYSTEM' });
    
    await sendModLog(interaction.guild, embed);
    await user.send({ embeds: [embed] }).catch(() => {});
    interaction.reply({ embeds: [embed] });
  }
};
