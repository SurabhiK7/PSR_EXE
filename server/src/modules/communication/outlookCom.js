const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const SCRIPT_PATH = path.join(__dirname, 'send-outlook-mail.ps1');

/**
 * Sends a message through the locally installed desktop Outlook app via COM, with the
 * subject/body/recipients (and optional file attachments). The message is sent immediately
 * using the signed-in mailbox - no review step. Windows + desktop Outlook only.
 * When `html` is provided it is used as the message's HTMLBody (rich formatting); otherwise
 * `text` is used as the plain-text Body.
 * @param {{ to?: string, cc?: string, subject: string, text?: string, html?: string, attachmentPaths?: string[], inlineImages?: { path: string, contentId: string }[] }} options
 *   `inlineImages` are added as hidden attachments with the given Content-ID (referenced from
 *   `html` via `cid:<contentId>`) - used for the org logo, since Outlook's Word-based renderer
 *   does not reliably display base64 data-URI images embedded directly in the HTML.
 */
function openOutlookDraft({ to, cc, subject, text, html, attachmentPaths, inlineImages }) {
  // Outlook COM automation only exists on Windows - fail fast with a clear error instead of
  // a raw ENOENT from trying to spawn a nonexistent powershell.exe (e.g. on a Linux host).
  if (process.platform !== 'win32') {
    const err = new Error('This server is not running on Windows, so it cannot automate the desktop Outlook app.');
    err.code = 'UNSUPPORTED_PLATFORM';
    return Promise.reject(err);
  }
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `pcp-mail-${crypto.randomUUID()}.json`);
    fs.writeFileSync(
      tmpFile,
      JSON.stringify({
        to: to || '',
        cc: cc || '',
        subject,
        body: text || '',
        html: html || '',
        attachmentPaths: attachmentPaths || [],
        inlineImages: inlineImages || [],
      }),
      'utf8'
    );

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT_PATH, '-DataPath', tmpFile],
      // Cold-starting Outlook and logging on to the MAPI session can take a while, so allow
      // generous headroom before giving up.
      { timeout: 60000 },
      (err, stdout, stderr) => {
        fs.unlink(tmpFile, () => {});
        if (err) {
          reject(new Error((stderr || '').trim() || err.message || 'Outlook automation failed.'));
          return;
        }
        resolve(stdout);
      }
    );
  });
}

module.exports = { openOutlookDraft };
