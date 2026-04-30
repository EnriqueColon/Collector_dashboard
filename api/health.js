export default function handler(_req, res) {
  const base64Key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  const rawKey =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    process.env.VITE_GOOGLE_SERVICE_ACCOUNT_KEY;

  let jsonString = null;
  let source = null;

  if (base64Key) {
    try {
      jsonString = Buffer.from(base64Key.trim(), 'base64').toString('utf8');
      source = 'base64';
    } catch (err) {
      return res.json({ status: 'error', source: 'base64', decodeError: err.message });
    }
  } else if (rawKey) {
    jsonString = rawKey.trim();
    const first = jsonString[0];
    const last = jsonString[jsonString.length - 1];
    if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
      jsonString = jsonString.slice(1, -1);
    }
    source = 'raw';
  } else {
    return res.json({ status: 'error', keyFound: false, message: 'No key found in environment' });
  }

  try {
    const credentials = JSON.parse(jsonString);
    const pk = credentials.private_key || '';

    // Check private key format without exposing the key
    const hasBeginMarker = pk.includes('-----BEGIN PRIVATE KEY-----');
    const hasEndMarker = pk.includes('-----END PRIVATE KEY-----');
    const actualNewlines = (pk.match(/\n/g) || []).length;
    const escapedNewlines = (pk.match(/\\n/g) || []).length;

    return res.json({
      status: 'ok',
      source,
      base64KeySet: !!base64Key,
      rawKeySet: !!rawKey,
      clientEmail: credentials.client_email,
      projectId: credentials.project_id,
      privateKey: {
        hasBeginMarker,
        hasEndMarker,
        actualNewlines,
        escapedNewlines,
        length: pk.length,
      },
    });
  } catch (err) {
    return res.json({
      status: 'error',
      source,
      parseError: err.message,
      first20: jsonString.substring(0, 20),
    });
  }
}
