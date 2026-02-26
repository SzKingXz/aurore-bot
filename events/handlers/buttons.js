const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { enterGiveaway } = require('../../db');

async function handleButton(interaction) {
  if (interaction.customId.startsWith('giveaway_enter_')) {
    try {
      const giveawayId = parseInt(interaction.customId.split('_')[2]);
      
      if (isNaN(giveawayId)) {
        return interaction.reply({ content: 'Error: Sorteo no válido', ephemeral: true });
      }
      
      const result = enterGiveaway(giveawayId, interaction.user.id);
      
      if (result === false) {
        return interaction.reply({ 
          content: '❌ Ya estás participando en este sorteo. No puedes entrar dos veces.',
          ephemeral: true 
        });
      }
      
      const message = interaction.message;
      if (message && message.embeds && message.embeds[0]) {
        const embed = message.embeds[0];
        const premioName = embed.description ? embed.description.replace(/\*\*/g, '').trim() : 'Sorteo';
        
        await interaction.reply({ 
          content: `🎉 ¡Participando en el sorteo de **${premioName}**!`,
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: `🎉 ¡Participando en el sorteo!`,
          ephemeral: true 
        });
      }
      
    } catch (error) {
      console.error('Error en handleButton:', error);
      await interaction.reply({ 
        content: 'Error al procesar tu participación', 
        ephemeral: true 
      }).catch(() => {});
    }
  }
}

module.exports = { handleButton };
