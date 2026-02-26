const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { PALETTE } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Envía un anuncio a un canal')
    .addChannelOption(opt => opt
      .setName('canal')
      .setDescription('Canal destino')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildText))
    .addStringOption(opt => opt
      .setName('titulo')
      .setDescription('Título del anuncio')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('mensaje')
      .setDescription('Contenido del anuncio')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('color')
      .setDescription('Color (primary, cyan, gold, error, success)')),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageMessages')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    
    const canal = interaction.options.getChannel('canal');
    const titulo = interaction.options.getString('titulo');
    const mensaje = interaction.options.getString('mensaje');
    const colorOpt = interaction.options.getString('color') || 'primary';
    
    const color = PALETTE[colorOpt] || PALETTE.primary;
    
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`✦ ${titulo}`)
      .setDescription(mensaje)
      .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
      .setFooter({ text: 'AURORE SYSTEM' })
      .setTimestamp();
    
    await canal.send({ embeds: [embed] });
    
    const respuesta = new EmbedBuilder()
      .setColor(PALETTE.success)
      .setTitle('✦ ANUNCIO ENVIADO')
      .setDescription(`Anuncio enviado a ${canal}`)
      .setFooter({ text: 'AURORE SYSTEM' });
    
    interaction.reply({ embeds: [respuesta] });
  }
};
