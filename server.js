// Backend proxy server for accessing private Google Sheets
// This server uses the service account to fetch data securely

import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import https from 'https';
import http from 'http';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables - try .env.server first, then .env
let envPath = join(__dirname, '.env.server');
let result;

// Try to load .env.server, but fall back to .env if it fails
if (existsSync(envPath)) {
  console.log('Loading .env from:', envPath);
  result = dotenv.config({ path: envPath });
  
  // If there's an error (like permission issues), fall back to .env
  if (result.error) {
    console.warn('⚠️  Could not load .env.server, falling back to .env:', result.error.message);
    envPath = join(__dirname, '.env');
    result = dotenv.config({ path: envPath });
  }
} else {
  envPath = join(__dirname, '.env');
  console.log('Loading .env from:', envPath);
  result = dotenv.config({ path: envPath });
}

if (result.error) {
  console.warn('⚠️  Could not load .env file (permission issue). Server will continue but may not have access to Google Sheets.');
  console.warn('   Error:', result.error.message);
  // Continue anyway - the server can still run, just won't have auth
} else {
  console.log('✅ .env file loaded');
  // Debug: show if the key exists (without showing the value)
  if (process.env.VITE_GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.log('✅ VITE_GOOGLE_SERVICE_ACCOUNT_KEY found in environment');
  } else {
    console.log('❌ VITE_GOOGLE_SERVICE_ACCOUNT_KEY NOT found in environment');
  }
}

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Enable CORS for the frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || NODE_ENV === 'production') {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in production for flexibility
    }
  },
  credentials: true
}));
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

const GOOGLE_SHEET_ID = '1cx-5MHBBWy1a7XGJTOhkQyAj5eMA_v0Qbkr-7xBJPXw';

// Initialize service account
let authClient = null;

function initializeAuth() {
  // Try both with and without VITE_ prefix
  let serviceAccountKey = process.env.VITE_GOOGLE_SERVICE_ACCOUNT_KEY || 
                          process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    console.error('ERROR: Service account key not found in .env file');
    console.error('Looking for: VITE_GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_KEY');
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('GOOGLE')));
    return null;
  }

  try {
    // Remove surrounding quotes if present (from .env file)
    let keyToParse = serviceAccountKey.trim();
    
    // Remove quotes - handle both single and double quotes
    const firstChar = keyToParse.charAt(0);
    const lastChar = keyToParse.charAt(keyToParse.length - 1);
    
    if ((firstChar === "'" && lastChar === "'") || (firstChar === '"' && lastChar === '"')) {
      keyToParse = keyToParse.slice(1, -1);
    }
    
    // Final trim - DO NOT convert \\n to \n here, JSON.parse will handle it
    keyToParse = keyToParse.trim();
    
    const credentials = JSON.parse(keyToParse);
    
    // Now convert the \n in the private_key to actual newlines (after parsing)
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    
    authClient = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    console.log('✅ Service account initialized successfully');
    return authClient;
  } catch (error) {
    console.error('ERROR: Failed to initialize service account:', error.message);
    console.error('First 100 chars of key:', serviceAccountKey.substring(0, 100));
    return null;
  }
}

// Initialize on startup
initializeAuth();

// API endpoint to fetch sheet data
app.get('/api/sheet-data', async (req, res) => {
  const sheetName = req.query.sheet || 'Complaints';

  // Try service account first if available
  if (authClient) {
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

      return res.json({ data });
    } catch (error) {
      console.error('Error fetching sheet data via API:', error);
      // Fall through to CSV export
      console.log('Falling back to CSV export...');
    }
  } else {
    console.log('Service account not available, using CSV export...');
  }

  // Fallback to CSV export (works for public sheets)
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    
    return new Promise((resolve, reject) => {
      const protocol = csvUrl.startsWith('https') ? https : http;
      
      protocol.get(csvUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch CSV: ${response.statusCode}`));
          return;
        }
        
        let csvData = '';
        response.on('data', (chunk) => {
          csvData += chunk;
        });
        
        response.on('end', () => {
          try {
            // Parse CSV
            const lines = csvData.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
              return resolve(res.json({ data: [] }));
            }
            
            // Parse header
            const headers = parseCSVLine(lines[0]);
            
            // Parse rows
            const data = [];
            for (let i = 1; i < lines.length; i++) {
              const values = parseCSVLine(lines[i]);
              const rowObj = {};
              headers.forEach((header, index) => {
                rowObj[header] = values[index] || '';
              });
              data.push(rowObj);
            }
            
            resolve(res.json({ data }));
          } catch (parseError) {
            reject(parseError);
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error fetching sheet data via CSV:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch sheet data',
      message: 'Both API and CSV export failed. Make sure the sheet is public or service account is configured.'
    });
  }
});

// Helper function to parse CSV line
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    authenticated: authClient !== null 
  });
});

// Serve static files from the React app in production
if (NODE_ENV === 'production') {
  const distPath = join(__dirname, 'dist');
  if (existsSync(distPath)) {
    // Serve static files
    app.use(express.static(distPath));
    
    // Handle React routing - return all requests to React app
    app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      res.sendFile(join(distPath, 'index.html'));
    });
    
    console.log('✅ Serving static files from dist/');
  } else {
    console.warn('⚠️  Production mode but dist/ folder not found. Run "npm run build" first.');
  }
}

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  if (NODE_ENV === 'production') {
    console.log(`📱 Open http://${HOST}:${PORT} in your browser`);
  } else {
    console.log(`📊 API endpoint: http://${HOST}:${PORT}/api/sheet-data?sheet=Complaints`);
  }
  if (!authClient) {
    console.log('⚠️  WARNING: Service account not initialized. Check your .env file.');
  }
});
