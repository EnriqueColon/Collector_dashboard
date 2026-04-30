const RENTCAST_BASE = 'https://api.rentcast.io/v1';

function appendState(address) {
  // If address doesn't already contain a state abbreviation or "New York", append NY
  const hasState = /,\s*[A-Z]{2}\b/.test(address) || /new york/i.test(address);
  return hasState ? address : `${address}, NY`;
}

export default async function handler(req, res) {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Address required' });

  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RENTCAST_API_KEY is not configured in environment variables.' });

  const headers = { 'X-Api-Key': apiKey, 'Accept': 'application/json' };
  const fullAddress = appendState(address);
  const encoded = encodeURIComponent(fullAddress);

  console.log(`[comps] Querying Rentcast for: "${fullAddress}"`);

  try {
    const [propRes, compsRes] = await Promise.all([
      fetch(`${RENTCAST_BASE}/properties?address=${encoded}&limit=1`, { headers }),
      fetch(`${RENTCAST_BASE}/avm/sale/comps?address=${encoded}&radius=5&limit=8`, { headers }),
    ]);

    const [propText, compsText] = await Promise.all([
      propRes.text(),
      compsRes.text(),
    ]);

    console.log(`[comps] Properties status: ${propRes.status}`);
    console.log(`[comps] Comps status: ${compsRes.status}`);
    console.log(`[comps] Comps response (first 500 chars): ${compsText.slice(0, 500)}`);

    let propJson = null;
    let compsJson = null;

    try { propJson = JSON.parse(propText); } catch { /* ignore */ }
    try { compsJson = JSON.parse(compsText); } catch { /* ignore */ }

    const property = Array.isArray(propJson) ? propJson[0] : (propJson && !propJson.error ? propJson : null);

    // Rentcast may return comparables at different keys depending on version
    const comps =
      compsJson?.comparables ??
      compsJson?.listings ??
      (Array.isArray(compsJson) ? compsJson : []);

    return res.json({
      property,
      comps,
      _debug: {
        addressQueried: fullAddress,
        compsStatus: compsRes.status,
        compsKeys: compsJson ? Object.keys(compsJson) : [],
        compsCount: comps.length,
      },
    });
  } catch (err) {
    console.error('[comps] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
