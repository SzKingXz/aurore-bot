const PALETTE = {
  primary: 0x7B2FE4,
  cyan: 0x00D4FF,
  gold: 0xFFD700,
  error: 0xFF4757,
  success: 0x2ED573,
  muted: 0x2F3136
};

const COLOR_ROLES = [
  { name: '🔴 Rojo',     color: '#E74C3C', value: 'color_rojo'    },
  { name: '🟠 Naranja',  color: '#E67E22', value: 'color_naranja' },
  { name: '🟡 Amarillo', color: '#F1C40F', value: 'color_amarillo'},
  { name: '🟢 Verde',    color: '#2ECC71', value: 'color_verde'   },
  { name: '🔵 Azul',     color: '#3498DB', value: 'color_azul'    },
  { name: '🟣 Morado',   color: '#9B59B6', value: 'color_morado'  },
  { name: '🟤 Café',     color: '#8B4513', value: 'color_cafe'    },
  { name: '⚫ Negro',    color: '#2C3E50', value: 'color_negro'   },
  { name: '⚪ Blanco',   color: '#ECF0F1', value: 'color_blanco'  },
  { name: '🩷 Rosa',     color: '#FF69B4', value: 'color_rosa'    }
];

module.exports = { PALETTE, COLOR_ROLES };
