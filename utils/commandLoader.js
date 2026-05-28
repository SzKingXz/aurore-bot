const fs   = require('fs');
const path = require('path');

function loadCommands() {
  const commands     = [];
  const commandsPath = path.join(__dirname, '..', 'commands');
  const folders      = fs.readdirSync(commandsPath);

  for (const folder of folders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      try {
        const command = require(filePath);
        if (command?.data && typeof command.execute === 'function') {
          commands.push(command);
        } else {
          console.warn(`[CMD] ${file}: sin data o execute — omitido`);
        }
      } catch (err) {
        console.error(`[CMD] Error cargando ${file}:`, err.message);
      }
    }
  }

  console.log(`[CMD] ${commands.length} comandos cargados`);
  return commands;
}

function getCommand(name, commands) {
  return commands.find(cmd => cmd.data.name === name) ?? null;
}

module.exports = { loadCommands, getCommand };
