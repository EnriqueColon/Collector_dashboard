import { google } from 'googleapis';

const GOOGLE_SHEET_ID = '1cx-5MHBBWy1a7XGJTOhkQyAj5eMA_v0Qbkr-7xBJPXw';

function parseCredentials() {
  // Prefer base64-encoded key (most reliable in Vercel)
  const base64Key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.VITE_GOOGLE_SERVICE_ACCOUNT_KEY;

  let jsonString;

  if (base64Key) {
    try {
      jsonString = Buffer.from(base64Key.trim(), 'base64').toString('utf8');
    } catch (err) {
      console.error('Failed to decode base64 key:', err.message);
      return null;
    }
  } else if (rawKey) {
    jsonString = rawKey.trim();
    const first = jsonString[0];
    const last = jsonString[jsonString.length - 1];
    if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
      jsonString = jsonString.slice(1, -1);
    }
  } else {
    return null;
  }

  try {
    const credentials = JSON.parse(jsonString);
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    return credentials;
  } catch (err) {
    console.error('Failed to parse credentials JSON:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  const sheetName = req.query.sheet || 'Complaints';

  const credentials = parseCredentials();
  if (!credentials) {
    return res.status(500).json({
      error: 'Service account not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 in Vercel environment variables.',
    });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
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

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.json({ data });
  } catch (error) {
    console.error('Error fetching sheet data:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
