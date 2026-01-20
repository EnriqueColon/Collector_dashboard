// Google Sheets API authentication using Service Account
// This is the secure way to access private Google Sheets

import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

let authClient: JWT | null = null;

/**
 * Initialize authentication with a service account
 * @param serviceAccountKey - Service account JSON key (as object or JSON string)
 */
export function initializeServiceAccount(
  serviceAccountKey: object | string
): JWT {
  try {
    let credentials: object;
    
    if (typeof serviceAccountKey === 'string') {
      credentials = JSON.parse(serviceAccountKey);
    } else {
      credentials = serviceAccountKey;
    }

    authClient = new google.auth.JWT({
      email: (credentials as any).client_email,
      key: (credentials as any).private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return authClient;
  } catch (error) {
    throw new Error(
      `Failed to initialize service account: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get authenticated client (initializes if needed)
 */
export async function getAuthenticatedClient(): Promise<JWT | null> {
  if (!authClient) {
    // Try to load from environment variable
    const serviceAccountKey = import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      try {
        authClient = initializeServiceAccount(serviceAccountKey);
        return authClient;
      } catch (error) {
        console.warn('Failed to initialize service account from environment:', error);
        return null;
      }
    }
    
    return null;
  }

  return authClient;
}

/**
 * Check if service account is configured
 */
export function isServiceAccountConfigured(): boolean {
  return authClient !== null || !!import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_KEY;
}

