const { enterGiveaway } = require('../../db');

async function handleButton(interaction) {
  if (interaction.customId.startsWith('giveaway_enter_')) {
    const giveawayId = parseInt(interaction.customId.split('_')[2]);
    const result = enterGiveaway(giveawayId, interaction.user.id);
    if (!result) {
      return interaction.reply({ content: '✦ Ya estás participando en este sorteo.', ephemeral: true });
    }
    return interaction.reply({ content: '🎉 ¡Entraste al sorteo!', ephemeral: true });
  }
}

module.exports = { handleButton };
