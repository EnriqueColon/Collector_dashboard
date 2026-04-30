export default async function handler(req, res) {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Address required' });

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CollectorDashboard/1.0 (mktinfo@safeharborcp.com)' },
    });

    if (!response.ok) throw new Error(`Nominatim returned ${response.status}`);

    const data = await response.json();
    if (!data.length) return res.json({ lat: null, lon: null });

    return res.json({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
  } catch (err) {
    console.error('Geocode error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
