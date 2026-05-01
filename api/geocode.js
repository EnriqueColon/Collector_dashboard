// Nominatim doesn't understand slash-range house numbers (e.g. "336/366 Main St").
// buildCandidates tries the raw address first, then falls back to each individual number.
function buildCandidates(address) {
  const candidates = [address];
  const slashNum = address.match(/^(\d+)\/(\d+)(\s.+)/);
  if (slashNum) {
    candidates.push(slashNum[1] + slashNum[3]); // first number only
    candidates.push(slashNum[2] + slashNum[3]); // second number only
  }
  return candidates;
}

async function nominatim(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'CollectorDashboard/1.0 (mktinfo@safeharborcp.com)' },
  });
  if (!response.ok) throw new Error(`Nominatim returned ${response.status}`);
  const data = await response.json();
  return data.length ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
}

export default async function handler(req, res) {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Address required' });

  try {
    const candidates = buildCandidates(address);
    for (const candidate of candidates) {
      const result = await nominatim(candidate);
      if (result) return res.json(result);
    }
    return res.json({ lat: null, lon: null });
  } catch (err) {
    console.error('Geocode error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
