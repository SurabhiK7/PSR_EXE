/**
 * Azure AD (Microsoft Graph) email integration — PLACEHOLDER.
 *
 * This module is intentionally inert until the required environment variables are
 * provided. Once configured, it sends mail automatically via Microsoft Graph's
 * /sendMail endpoint using the OAuth2 client-credentials flow (app-only auth).
 *
 * Required environment variables (add to server/.env once available):
 *   AZURE_TENANT_ID       - Azure AD tenant (directory) ID
 *   AZURE_CLIENT_ID       - App registration (client) ID
 *   AZURE_CLIENT_SECRET   - App registration client secret
 *   AZURE_SENDER_EMAIL    - Mailbox the app is permitted to send as (application permission: Mail.Send)
 *
 * Until these are set, callers should fall back to the existing local Outlook
 * desktop automation (see mailer.js / outlookCom.js), which continues to work
 * independently of this module.
 */

const REQUIRED_ENV_VARS = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_SENDER_EMAIL'];

function isAzureMailConfigured() {
  return REQUIRED_ENV_VARS.every((key) => Boolean(process.env[key]));
}

function getMissingEnvVars() {
  return REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
}

async function getGraphAccessToken() {
  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env;
  const tokenUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: AZURE_CLIENT_ID,
    client_secret: AZURE_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Failed to acquire Azure AD token (${response.status}): ${errText || response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Sends an email automatically via Microsoft Graph on behalf of AZURE_SENDER_EMAIL.
 * @param {{ to: string[], cc?: string[], subject: string, html: string, attachments?: { name: string, contentType: string, contentBytes: string }[] }} options
 */
async function sendMailViaGraph({ to, cc, subject, html, attachments }) {
  if (!isAzureMailConfigured()) {
    const err = new Error(
      'Automated email sending is not configured yet. Add AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, ' +
        'and AZURE_SENDER_EMAIL to the server .env file to enable this feature.'
    );
    err.code = 'AZURE_MAIL_NOT_CONFIGURED';
    throw err;
  }

  const token = await getGraphAccessToken();

  const message = {
    subject,
    body: { contentType: 'HTML', content: html },
    toRecipients: (to || []).map((address) => ({ emailAddress: { address } })),
    ccRecipients: (cc || []).map((address) => ({ emailAddress: { address } })),
  };

  if (attachments && attachments.length) {
    message.attachments = attachments.map((a) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: a.name,
      contentType: a.contentType || 'application/octet-stream',
      contentBytes: a.contentBytes,
    }));
  }


  const sendUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(process.env.AZURE_SENDER_EMAIL)}/sendMail`;
  const response = await fetch(sendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Microsoft Graph sendMail failed (${response.status}): ${errText || response.statusText}`);
  }
}

module.exports = { isAzureMailConfigured, getMissingEnvVars, sendMailViaGraph };
