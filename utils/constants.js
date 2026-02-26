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

const EIGHTBALL = [
  'Sí, definitivamente',
  'Es cierto',
  'Definitivamente',
  'Puedes contar con ello',
  'Como yo lo veo, sí',
  'La mayoría dice que sí',
  'Las perspectivas son buenas',
  'Muy prometedor',
  'Respuesta nebulosa, intenta después',
  'Pregunta de nuevo después',
  'Mejor no decirte ahora',
  'Concentrese e intente de nuevo',
  'No cuentes con ello',
  'No',
  'Definitivamente no',
  'Mis fuentes dicen que no',
  'Las perspectivas no son tan buenas',
  'Muy dudoso'
];

const REGION_ROLES = [
  { name: '🌎 Latam',      value: 'region_latam' },
  { name: '🇲🇽 México',   value: 'region_mexico' },
  { name: '🇦🇷 Argentina', value: 'region_argentina' },
  { name: '🇨🇴 Colombia',  value: 'region_colombia' },
  { name: '🇪🇸 España',    value: 'region_españa' },
  { name: '🇺🇸 USA',       value: 'region_usa' },
  { name: '🇧🇷 Brasil',    value: 'region_brasil' },
  { name: '🇨🇱 Chile',     value: 'region_chile' },
  { name: '🇵🇪 Perú',      value: 'region_peru' },
  { name: '🌍 Europa',     value: 'region_europa' },
  { name: '🌏 Asia',       value: 'region_asia' },
  { name: '❓ Otro',       value: 'region_otro' }
];

const SPAM_CONFIG = {
  LIMIT: 6,
  WINDOW: 5000,
  TIMEOUT_MIN: 5
};

module.exports = { PALETTE, COLOR_ROLES, REGION_ROLES, EIGHTBALL, SPAM_CONFIG };
