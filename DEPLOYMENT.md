# Deployment Guide

This guide explains how to package and deploy the Collector Dashboard for team members to use without running development servers.

## Quick Start (Production Mode)

### Option 1: Build and Start (Recommended)

```bash
# Build the frontend and start the production server
npm run build:start
```

This will:
1. Build the React frontend for production
2. Start the server on port 3001 (or PORT from environment)
3. Serve the dashboard at `http://localhost:3001`

### Option 2: Separate Steps

```bash
# Step 1: Build the frontend
npm run build

# Step 2: Start the production server
npm start
```

## Production Server

The production server:
- Serves the built React app from the `dist/` folder
- Provides API endpoints for Google Sheets data
- Handles all routing (including React Router)
- Runs on port 3001 by default (configurable via `PORT` environment variable)

## Environment Setup

### Required Files

1. **`.env.server`** (or `.env`) - Contains Google Service Account credentials
   ```
   VITE_GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
   ```

2. **`.env`** - Optional frontend environment variables
   ```
   VITE_API_URL=http://localhost:3001
   ```

### Setting Up Service Account

1. Create a Google Service Account (see `GOOGLE_SHEETS_AUTH.md`)
2. Share your Google Sheet with the service account email
3. Add the service account JSON key to `.env.server`:
   ```bash
   VITE_GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
   ```

**Note**: The key must be on a single line with escaped quotes.

## Sharing with Team Members

### Method 1: Local Installation

1. **Share the project folder** (via Git, zip file, or shared drive)
2. **Team members install dependencies**:
   ```bash
   npm install
   ```
3. **Team members set up environment**:
   - Copy `.env.server` (or create their own with service account key)
   - Or make the Google Sheet public (view-only) to skip authentication
4. **Team members start the server**:
   ```bash
   npm run build:start
   ```
5. **Open browser** to `http://localhost:3001`

### Method 2: Pre-built Package

1. **Build the project**:
   ```bash
   npm run build
   ```
2. **Share the entire project folder** (including `dist/`, `node_modules/`, `server.js`, etc.)
3. **Team members just run**:
   ```bash
   npm start
   ```
   (No build step needed)

### Method 3: Network Access

To allow other team members on your network to access:

1. **Start the server**:
   ```bash
   npm run build:start
   ```
2. **Find your local IP address**:
   - Mac/Linux: `ifconfig | grep "inet "`
   - Windows: `ipconfig`
3. **Share the URL**: `http://YOUR_IP_ADDRESS:3001`
4. **Update CORS** in `server.js` if needed (already configured to allow all in production)

## Production Checklist

- [ ] Build completed successfully (`npm run build`)
- [ ] `.env.server` file exists with service account key
- [ ] Google Sheet is shared with service account email
- [ ] Server starts without errors
- [ ] Dashboard loads at `http://localhost:3001`
- [ ] Data loads correctly from Google Sheets
- [ ] All features work (Summary, Detail views, exports)

## Troubleshooting

### "dist/ folder not found"
- Run `npm run build` first

### "Service account not initialized"
- Check `.env.server` file exists
- Verify service account key is correctly formatted (single line, escaped quotes)
- Ensure Google Sheet is shared with service account email

### "Cannot connect to backend"
- Verify server is running on port 3001
- Check firewall settings
- Try `http://localhost:3001/api/health` to test backend

### Port already in use
- Change port: `PORT=3002 npm start`
- Or kill existing process: `lsof -ti:3001 | xargs kill -9`

## Advanced: Running as a Service

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start npm --name "collector-dashboard" -- run start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### Using systemd (Linux)

Create `/etc/systemd/system/collector-dashboard.service`:

```ini
[Unit]
Description=Collector Dashboard
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/Collector_Dashboard
Environment="NODE_ENV=production"
Environment="PORT=3001"
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable collector-dashboard
sudo systemctl start collector-dashboard
```

## Security Notes

- **Never commit** `.env.server` or `.env` files to version control
- Keep service account keys secure
- Use HTTPS in production (consider using a reverse proxy like nginx)
- Restrict network access if needed (firewall rules)

## Updating the Dashboard

When updates are available:

1. **Pull latest changes** (if using Git):
   ```bash
   git pull
   ```

2. **Rebuild**:
   ```bash
   npm run build:start
   ```

3. **Or if using PM2**:
   ```bash
   pm2 restart collector-dashboard
   ```
