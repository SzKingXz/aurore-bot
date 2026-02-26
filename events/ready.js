const { Events, ActivityType } = require('discord.js');
const { startReminderLoop, startGiveawayLoop } = require('./loops');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`✅ AURORE online — ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: '/help • aurore system', type: ActivityType.Watching }],
      status: 'online'
    });
    startReminderLoop(client);
    startGiveawayLoop(client);
  }
};
