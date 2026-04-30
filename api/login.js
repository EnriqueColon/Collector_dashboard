export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};
  const correctPassword = process.env.DASHBOARD_PASSWORD;

  if (!correctPassword) {
    return res.status(500).json({ error: 'DASHBOARD_PASSWORD is not configured.' });
  }

  if (!password || password !== correctPassword) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  return res.json({ success: true });
}
