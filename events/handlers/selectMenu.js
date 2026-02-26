const { EmbedBuilder } = require('discord.js');
const { PALETTE, COLOR_ROLES, REGION_ROLES, HELP_DATA } = require('../../utils/constants');

async function handleSelectMenu(interaction, client) {
  if (interaction.customId === 'help_category') {
    const data = HELP_DATA[interaction.values[0]];
    if (!data) return;
    const cmds = data.cmds.map(c => `\`${c}\``).join('\n');
    const embed = new EmbedBuilder()
      .setColor(PALETTE.primary)
      .setTitle(`✦ ${data.title}`)
      .setDescription(data.desc)
      .addFields({ name: 'Comandos', value: cmds })
      .setFooter({ text: 'AURORE SYSTEM', iconURL: client.user.displayAvatarURL() });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
  
  if (interaction.customId === 'select_color') {
    const roleValue = interaction.values[0];
    const role = COLOR_ROLES.find(r => r.value === roleValue);
    if (!role) return;
    const existingColorRoles = interaction.member.roles.cache.filter(r =>
      COLOR_ROLES.some(cr => cr.value === r.name.toLowerCase().replace(' ', '_'))
    );
    for (const [, r] of existingColorRoles) {
      await interaction.member.roles.remove(r).catch(() => {});
    }
    const guildRole = interaction.guild.roles.cache.find(r => r.name === role.name);
    if (guildRole) {
      await interaction.member.roles.add(guildRole).catch(() => {});
      return interaction.reply({ content: `✅ Color actualizado a **${role.name}**`, ephemeral: true });
    }
    return interaction.reply({ content: `❌ El rol **${role.name}** no existe.`, ephemeral: true });
  }
  
  if (interaction.customId === 'select_region') {
    const regionValue = interaction.values[0];
    const region = REGION_ROLES.find(r => r.value === regionValue);
    if (!region) return;
    const existingRegionRoles = interaction.member.roles.cache.filter(r =>
      REGION_ROLES.some(rr => rr.value === r.name.toLowerCase().replace(/ /g, '_'))
    );
    for (const [, r] of existingRegionRoles) {
      await interaction.member.roles.remove(r).catch(() => {});
    }
    const guildRole = interaction.guild.roles.cache.find(r => r.name === region.name);
    if (guildRole) {
      await interaction.member.roles.add(guildRole).catch(() => {});
      return interaction.reply({ content: `✅ Región actualizada a **${region.name}**`, ephemeral: true });
    }
    return interaction.reply({ content: `❌ El rol **${region.name}** no existe.`, ephemeral: true });
  }
}

module.exports = { handleSelectMenu };
