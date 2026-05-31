function requireSession(req, res, next) {
  if (req._bypassAuth) return next();

  const bearer = req.headers['authorization']?.startsWith('Bearer ')
    ? req.headers['authorization'].slice(7)
    : null;

  if (bearer) { req._accessToken = bearer; return next(); }

  const raw = req.headers.cookie ?? '';
  let token = null;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === 'aurore_access') {
      try { token = decodeURIComponent(part.slice(idx + 1).trim()); }
      catch { token = part.slice(idx + 1).trim(); }
      break;
    }
  }

  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  req._accessToken = token;
  next();
}
