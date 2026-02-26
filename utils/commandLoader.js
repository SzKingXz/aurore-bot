const fs = require('fs');
const path = require('path');

function loadCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, '..', 'commands');
  const folders = fs.readdirSync(commandsPath);
  
  for (const folder of folders) {
    const folderPath = path.join(commandsPath, folder);
    const isDirectory = fs.statSync(folderPath).isDirectory();
    if (!isDirectory) continue;
    
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const command = require(filePath);
      if (command.data) commands.push(command);
    }
  }
  return commands;
}

async function registerCommands(client) {
  const commands = loadCommands();
  const commandData = commands.map(cmd => cmd.data.toJSON());
  
  try {
    await client.rest.put(
      require('discord.js').Routes.applicationCommands(client.user.id),
      { body: commandData }
    );
    console.log(`✅ ${commands.length} comandos registrados`);
  } catch (error) {
    console.error('Error registrando comandos:', error);
  }
  return commands;
}

function getCommand(name, commands) {
  return commands.find(cmd => cmd.data.name === name);
}

module.exports = { loadCommands, registerCommands, getCommand };
