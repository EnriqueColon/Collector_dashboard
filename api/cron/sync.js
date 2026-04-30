// Weekly cron job — verifies Google Sheets data pipeline is healthy.
// Scheduled via vercel.json. Requires CRON_SECRET env var on Vercel.

export default async function handler(req, res) {
  // Vercel sends the CRON_SECRET as a Bearer token to prevent unauthorized triggers
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sheetName = 'Complaints';
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3001';

  try {
    const response = await fetch(`${baseUrl}/api/sheet-data?sheet=${encodeURIComponent(sheetName)}`);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Sheet data fetch returned ${response.status}: ${body}`);
    }

    const json = await response.json();
    const rowCount = json.data?.length ?? 0;

    console.log(`[weekly-sync] Success — ${rowCount} rows fetched from "${sheetName}" at ${new Date().toISOString()}`);

    return res.json({
      success: true,
      sheet: sheetName,
      rowCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[weekly-sync] Failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
