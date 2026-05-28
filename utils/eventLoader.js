const fs   = require('fs');
const path = require('path');

function loadEvents(client) {
  const eventsPath = path.join(__dirname, '..', 'events');
  const files      = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  let loaded = 0;

  for (const file of files) {
    const filePath = path.join(eventsPath, file);
    const event    = require(filePath);

    if (!event?.name || typeof event.execute !== 'function') continue;

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    loaded++;
  }

  console.log(`[EVENTS] ${loaded} eventos cargados`);
}

module.exports = { loadEvents };
