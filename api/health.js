export default function handler(req, res) {
  const rawKey =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    process.env.VITE_GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!rawKey) {
    return res.json({
      status: 'error',
      keyFound: false,
      message: 'GOOGLE_SERVICE_ACCOUNT_KEY is not set in environment variables',
    });
  }

  let keyToParse = rawKey.trim();
  const first = keyToParse[0];
  const last = keyToParse[keyToParse.length - 1];
  if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
    keyToParse = keyToParse.slice(1, -1);
  }

  try {
    const credentials = JSON.parse(keyToParse);
    return res.json({
      status: 'ok',
      keyFound: true,
      keyLength: rawKey.length,
      firstChars: rawKey.substring(0, 15),
      parsedOk: true,
      clientEmail: credentials.client_email,
      projectId: credentials.project_id,
    });
  } catch (err) {
    return res.json({
      status: 'error',
      keyFound: true,
      keyLength: rawKey.length,
      firstChars: rawKey.substring(0, 15),
      parsedOk: false,
      parseError: err.message,
    });
  }
}
