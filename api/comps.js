const RENTCAST_BASE = 'https://api.rentcast.io/v1';

export default async function handler(req, res) {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Address required' });

  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RENTCAST_API_KEY is not configured in environment variables.' });

  const headers = { 'X-Api-Key': apiKey, 'Accept': 'application/json' };
  const encoded = encodeURIComponent(address);

  try {
    const [propRes, compsRes] = await Promise.all([
      fetch(`${RENTCAST_BASE}/properties?address=${encoded}&limit=1`, { headers }),
      fetch(`${RENTCAST_BASE}/avm/sale/comps?address=${encoded}&radius=1&limit=6`, { headers }),
    ]);

    const [propJson, compsJson] = await Promise.all([
      propRes.ok ? propRes.json() : null,
      compsRes.ok ? compsRes.json() : null,
    ]);

    const property = Array.isArray(propJson) ? propJson[0] : null;
    const comps = compsJson?.comparables ?? [];

    return res.json({ property, comps });
  } catch (err) {
    console.error('Comps error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
