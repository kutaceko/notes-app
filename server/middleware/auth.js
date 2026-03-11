const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Přístup odepřen. Přihlaste se prosím.' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, username: decoded.username };
    next();
  } catch {
    return res.status(401).json({ error: 'Neplatný nebo expirovaný token.' });
  }
}

module.exports = authenticate;
