const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE, COLOR_ROLES, REGION_ROLES } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crear-roles')
    .setDescription('Crea roles de colores y/o regiones')
    .addStringOption(opt => opt
      .setName('tipo')
      .setDescription('Qué roles crear')
      .setRequired(true)
      .addChoices(
        { name: 'Colores', value: 'colors' },
        { name: 'Regiones', value: 'regions' },
        { name: 'Todos', value: 'all' }
      )),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageRoles')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    
    await interaction.deferReply();
    const tipo = interaction.options.getString('tipo');
    let creados = 0;
    
    const crearRoles = async (rolesList) => {
      for (const role of rolesList) {
        const existe = interaction.guild.roles.cache.find(r => r.name === role.name);
        if (!existe) {
          try {
            await interaction.guild.roles.create({
              name: role.name,
              color: role.color,
              reason: 'Creado por comando /crear-roles'
            });
            creados++;
          } catch (e) {
            console.error(`Error creando rol ${role.name}:`, e);
          }
        }
      }
    };
    
    if (tipo === 'colors' || tipo === 'all') await crearRoles(COLOR_ROLES);
    if (tipo === 'regions' || tipo === 'all') await crearRoles(REGION_ROLES);
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.success)
      .setTitle('✦ ROLES CREADOS')
      .setDescription(`Se crearon **${creados}** roles exitosamente.`)
      .setFooter({ text: 'AURORE SYSTEM' });
    interaction.editReply({ embeds: [embed] });
  }
};
