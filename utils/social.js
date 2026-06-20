const { EmbedBuilder } = require('discord.js');
const { getSocialMonitors, updateSocialLastPost } = require('../db');

const PLATFORM_META = {
  youtube: { color: 0xFF0000, icon: '▶', label: 'YouTube' },
  x:       { color: 0x000000, icon: '✕', label: 'X'       },
  tiktok:  { color: 0x010101, icon: '♪', label: 'TikTok'  },
};

async function checkYouTube(monitor) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${monitor.creator_id}&order=date&maxResults=1&type=video&key=${key}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;
    const videoId = item.id?.videoId;
    if (!videoId || videoId === monitor.last_post_id) return null;
    return {
      id:        videoId,
      title:     item.snippet.title,
      url:       `https://youtube.com/watch?v=${videoId}`,
      thumbnail: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
    };
  } catch { return null; }
}

async function checkX(monitor) {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) return null;
  try {
    const url = `https://api.twitter.com/2/users/${monitor.creator_id}/tweets?max_results=5&tweet.fields=created_at,entities&expansions=attachments.media_keys&media.fields=url,preview_image_url&exclude=retweets,replies`;
    const res  = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal:  AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data   = await res.json();
    const tweet  = data.data?.[0];
    if (!tweet || tweet.id === monitor.last_post_id) return null;
    const media = data.includes?.media?.[0];
    return {
      id:        tweet.id,
      title:     tweet.text.slice(0, 200),
      url:       `https://x.com/${monitor.creator_name}/status/${tweet.id}`,
      thumbnail: media?.url ?? media?.preview_image_url ?? null,
      publishedAt: tweet.created_at,
    };
  } catch { return null; }
}

async function checkTikTok(monitor) {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const url = 'https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,share_url,create_time';
    const res  = await fetch(url, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ max_count: 5 }),
      signal:  AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data  = await res.json();
    const video = data.data?.videos?.[0];
    if (!video || String(video.id) === monitor.last_post_id) return null;
    return {
      id:        String(video.id),
      title:     video.title || 'Nuevo video',
      url:       video.share_url,
      thumbnail: video.cover_image_url ?? null,
      publishedAt: new Date(video.create_time * 1000).toISOString(),
    };
  } catch { return null; }
}

const CHECKERS = { youtube: checkYouTube, x: checkX, tiktok: checkTikTok };

function buildEmbed(monitor, post) {
  const meta = PLATFORM_META[monitor.platform] ?? { color: 0x2a4fff, icon: '◈', label: monitor.platform };
  const msg  = monitor.message || `¡${monitor.creator_name} subió contenido nuevo en ${meta.label}!`;

  const embed = new EmbedBuilder()
    .setColor(meta.color)
    .setAuthor({ name: `${meta.icon}  ${monitor.creator_name}`, url: monitor.creator_url ?? undefined })
    .setTitle(post.title.slice(0, 256))
    .setURL(post.url)
    .setFooter({ text: `${meta.label} · AURORE SYSTEM` })
    .setTimestamp(post.publishedAt ? new Date(post.publishedAt) : undefined);

  if (post.thumbnail) embed.setImage(post.thumbnail);
  return { content: msg, embed };
}

module.exports = function startSocialLoop(client) {
  const INTERVALS = { youtube: 5 * 60_000, x: 3 * 60_000, tiktok: 5 * 60_000 };
  const lastChecked = new Map();

  const run = async () => {
    const monitors = getSocialMonitors();
    const now      = Date.now();

    for (const m of monitors) {
      const interval  = INTERVALS[m.platform] ?? 5 * 60_000;
      const lastCheck = lastChecked.get(m.id) ?? 0;
      if (now - lastCheck < interval) continue;
      lastChecked.set(m.id, now);

      const checker = CHECKERS[m.platform];
      if (!checker) continue;

      const post = await checker(m);
      if (!post) continue;

      updateSocialLastPost(m.id, post.id);

      const channel = await client.channels.fetch(m.channel_id).catch(() => null);
      if (!channel?.isTextBased()) continue;

      const { content, embed } = buildEmbed(m, post);
      await channel.send({ content, embeds: [embed] }).catch(err => console.error('[Social]', err.message));

      global.auroreBroadcast?.(m.guild_id, {
        type:        'social_notification',
        guildId:     String(m.guild_id),
        platform:    m.platform,
        creatorName: m.creator_name,
        postUrl:     post.url,
        postTitle:   post.title,
        message:     `${m.creator_name} publicó algo nuevo en ${PLATFORM_META[m.platform]?.label ?? m.platform}`,
        ts:          Date.now(),
      });
    }
  };

  run();
  const id = setInterval(run, 60_000);
  return () => clearInterval(id);
};
