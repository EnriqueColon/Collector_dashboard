# Google Sheets Authentication Guide

## ⚠️ Security Note

**Never share your Google account password or store it in code.** Instead, use one of the secure authentication methods below.

## Option 1: Service Account (Recommended for Private Sheets)

A service account is a special Google account that represents your application, not a user. This is the **best and most secure** way to access private Google Sheets programmatically.

### Step 1: Create a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **Google Sheets API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

4. Create a Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Give it a name (e.g., "collector-dashboard")
   - Click "Create and Continue"
   - Skip the optional steps and click "Done"

5. Create a Key:
   - Click on the service account you just created
   - Go to the "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Click "Create" - this downloads a JSON file

### Step 2: Share the Google Sheet with the Service Account

1. Open the downloaded JSON file
2. Copy the `client_email` value (looks like: `your-service-account@project-id.iam.gserviceaccount.com`)
3. Open your Google Sheet
4. Click "Share" button
5. Paste the service account email
6. Give it "Viewer" permissions
7. Click "Send"

### Step 3: Configure the Dashboard

You have two options:

#### Option A: Environment Variable (Recommended for Development)

1. Create a `.env` file in the project root:
   ```bash
   VITE_GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
   ```

2. **Important**: Add `.env` to `.gitignore` to keep your credentials secure!

3. The dashboard will automatically use this when it starts.

#### Option B: Service Account File (Alternative)

1. Place the downloaded JSON file in the project root as `service-account-key.json`
2. Update `src/services/googleSheetsAuth.ts` to load from the file (not recommended for production)

### Step 4: Verify It Works

1. Start the dashboard:
   ```bash
   npm run dev
   ```

2. Check the browser console - you should see data loading without errors.

## Option 2: Make Sheet Public (View-Only) - Simplest

If you don't need the sheet to remain private, this is the easiest option:

1. Open your Google Sheet
2. Click the "Share" button
3. Click "Change to anyone with the link"
4. Select "Viewer" permissions
5. Click "Done"

The dashboard will automatically work with public sheets using CSV export.

## Option 3: OAuth 2.0 (For User-Specific Access)

OAuth 2.0 allows users to grant the application access to their own Google Sheets. This is more complex but useful if you want users to connect their own sheets.

**Note**: OAuth 2.0 requires a backend server to securely handle tokens. For a frontend-only application, use Service Account instead.

## Troubleshooting

### "Failed to fetch data from Google Sheets"

**Possible causes:**
1. **Sheet is private and no authentication is set up**
   - Solution: Set up service account authentication (Option 1) or make the sheet public (Option 2)

2. **Service account doesn't have access**
   - Solution: Make sure you shared the sheet with the service account email (from the JSON file)

3. **Service account key is invalid**
   - Solution: Re-download the key from Google Cloud Console

4. **Google Sheets API is not enabled**
   - Solution: Enable it in Google Cloud Console > APIs & Services > Library

### "Permission denied" error

- Make sure the service account email has been added as a viewer to the Google Sheet
- Check that the service account JSON key is correct

### Environment variable not working

- Make sure the `.env` file is in the project root (same level as `package.json`)
- Restart the development server after creating/updating `.env`
- Check that the JSON is properly escaped (use single quotes around the JSON string)

## Security Best Practices

1. ✅ **DO**: Use service accounts for automated access
2. ✅ **DO**: Keep service account keys in `.env` file (not in code)
3. ✅ **DO**: Add `.env` to `.gitignore`
4. ✅ **DO**: Use "Viewer" permissions (read-only) for the service account
5. ❌ **DON'T**: Commit service account keys to git
6. ❌ **DON'T**: Share service account keys publicly
7. ❌ **DON'T**: Use email/password authentication

## Example Service Account JSON Structure

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@project-id.iam.gserviceaccount.com",
  "client_id": "client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

## Need Help?

If you're having trouble setting up authentication:
1. Check the browser console for specific error messages
2. Verify the service account has access to the sheet
3. Make sure Google Sheets API is enabled
4. Try making the sheet public temporarily to test if the dashboard works

