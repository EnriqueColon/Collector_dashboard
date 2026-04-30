import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const GOOGLE_SHEET_ID = '1cx-5MHBBWy1a7XGJTOhkQyAj5eMA_v0Qbkr-7xBJPXw';

function getAuthClient() {
  const rawKey =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    process.env.VITE_GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!rawKey) return null;

  try {
    let keyToParse = rawKey.trim();
    const first = keyToParse[0];
    const last = keyToParse[keyToParse.length - 1];
    if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
      keyToParse = keyToParse.slice(1, -1);
    }

    const credentials = JSON.parse(keyToParse);
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    return new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  } catch (err) {
    console.error('Failed to initialize auth client:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  const sheetName = req.query.sheet || 'Complaints';

  const authClient = getAuthClient();
  if (!authClient) {
    return res.status(500).json({
      error:
        'Service account not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY in Vercel environment variables.',
    });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: sheetName,
    });

    if (!response.data.values || response.data.values.length === 0) {
      return res.json({ data: [] });
    }

    const [headers, ...rows] = response.data.values;
    const data = rows.map((row) => {
      const rowObj = {};
      headers.forEach((header, index) => {
        rowObj[header] = row[index] || '';
      });
      return rowObj;
    });

    // Cache for 1 hour on Vercel's edge, serve stale while revalidating
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.json({ data });
  } catch (error) {
    console.error('Error fetching sheet data:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
