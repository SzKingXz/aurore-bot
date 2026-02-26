const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Ver el avatar de un usuario')
    .addUserOption(opt => opt
      .setName('usuario')
      .setDescription('Usuario')),
  async execute(interaction) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const embed = new EmbedBuilder()
      .setColor(PALETTE.primary)
      .setTitle(`✦ AVATAR - ${user.username}`)
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setFooter({ text: 'AURORE SYSTEM' });
    interaction.reply({ embeds: [embed] });
  }
};
