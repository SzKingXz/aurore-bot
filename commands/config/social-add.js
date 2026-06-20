const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { addSocialMonitor } = require('../../db');

const PLATFORM_HINTS = {
  youtube: 'El ID del canal (empieza con UC..., lo encuentras en la URL del canal → Acerca de → Compartir canal)',
  x:       'El ID numérico de usuario de X (no el @handle) — usa una herramienta como tweeterid.com',
  tiktok:  'El @username exacto, sin espacios',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social-add')
    .setDescription('Monitorea un creador de YouTube, X o TikTok y anuncia su contenido nuevo')
    .addStringOption(opt => opt
      .setName('plataforma').setDescription('Red social a monitorear').setRequired(true)
      .addChoices(
        { name: 'YouTube', value: 'youtube' },
        { name: 'X (Twitter)', value: 'x' },
        { name: 'TikTok', value: 'tiktok' },
      ))
    .addStringOption(opt => opt.setName('id').setDescription('ID o usuario del creador (ver /help social)').setRequired(true))
    .addStringOption(opt => opt.setName('nombre').setDescription('Nombre a mostrar en el anuncio').setRequired(true))
    .addChannelOption(opt => opt
      .setName('canal').setDescription('Canal donde se anunciará').setRequired(true)
      .addChannelTypes(ChannelType.GuildText))
    .addStringOption(opt => opt.setName('mensaje').setDescription('Mensaje personalizado (opcional, usa {nombre})').setMaxLength(200))
    .addStringOption(opt => opt.setName('url').setDescription('URL del perfil (opcional)')),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }

    const platform = interaction.options.getString('plataforma');
    const creatorId = interaction.options.getString('id').trim();
    const name      = interaction.options.getString('nombre').trim();
    const channel   = interaction.options.getChannel('canal');
    const message   = interaction.options.getString('mensaje');
    const url       = interaction.options.getString('url');

    const envKey = { youtube: 'YOUTUBE_API_KEY', x: 'X_BEARER_TOKEN', tiktok: 'TIKTOK_ACCESS_TOKEN' }[platform];
    const hasKey = !!process.env[envKey];

    const monitor = addSocialMonitor(interaction.guildId, channel.id, platform, creatorId, name, url, message);
    if (!monitor) {
      return interaction.reply({ content: '❌ Error al guardar el monitor.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(PALETTE.success)
      .setTitle('MONITOR CONFIGURADO')
      .setDescription(`Ahora AURORE avisará en ${channel} cuando **${name}** publique en **${platform.toUpperCase()}**.`)
      .addFields({ name: 'ID configurado', value: `\`${creatorId}\`` })
      .setFooter({ text: 'AURORE SYSTEM' })
      .setTimestamp();

    if (!hasKey) {
      embed.addFields({
        name: '⚠️ Acción requerida',
        value: `Falta configurar \`${envKey}\` en el servidor para que este monitor funcione. ${PLATFORM_HINTS[platform]}`,
      });
    }

    interaction.reply({ embeds: [embed] });
  },
};
