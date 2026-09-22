const { openOutlookDraft } = require('./outlookCom');

/**
 * Sends a message through the locally installed desktop Outlook app with the subject/body
 * (and recipients / attachments, if provided). The message is sent immediately using the
 * signed-in mailbox - no review step. Windows + desktop Outlook only.
 * Pass `html` to use a rich HTML message body (preferred); `text` is used as a plain-text
 * fallback when `html` is not provided.
 * @param {{ to?: string, cc?: string, subject: string, text?: string, html?: string, attachmentPaths?: string[], inlineImages?: { path: string, contentId: string }[] }} options
 */
async function openInOutlook({ to, cc, subject, text, html, attachmentPaths, inlineImages }) {
  try {
    await openOutlookDraft({ to, cc, subject, text, html, attachmentPaths, inlineImages });
  } catch (err) {
    if (err.code === 'UNSUPPORTED_PLATFORM') {
      const wrapped = new Error(
        "Automatic sending isn't available in this environment - use Download to get the report and send it manually, or ask an admin to configure automatic email sending."
      );
      wrapped.code = 'OUTLOOK_UNAVAILABLE';
      throw wrapped;
    }
    const wrapped = new Error(
      `Could not open Outlook: ${err.message}. Make sure the desktop Outlook app is installed and signed in on this machine.`
    );
    wrapped.code = 'OUTLOOK_COM_FAILED';
    throw wrapped;
  }
}

module.exports = { openInOutlook };
