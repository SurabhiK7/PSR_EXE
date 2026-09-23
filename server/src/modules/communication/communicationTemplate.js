/**
 * Builds the HTML "Project Status Report" communication that is used for:
 *  - the live Preview dialog (client renders this HTML inside an iframe),
 *  - the "Download" action (saved as a standalone .html file),
 *  - the actual email body once sending is enabled (Microsoft Graph HTML body, and the
 *    Outlook desktop draft's HTMLBody) — so the same real-time-populated template is what
 *    ultimately gets pasted into the mail.
 *
 * All dynamic values are HTML-escaped to prevent HTML/script injection from free-text fields.
 */
const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');
const { ORG_NAME, TAGLINE } = require('../../config/branding');

const BRAND_COLOR = '#0B6FCE';
// Matches the teal-green accent used in the app sidebar/logo wordmark.
const HEADER_GREEN_FROM = '#01A982';
const HEADER_GREEN_TO = '#017D63';
const TEXT_MUTED = '#5B6472';
const TEXT_DARK = '#101828';
const BORDER_COLOR = '#E3E7ED';

const RAG_COLORS = { Green: '#0E7A2E', Yellow: '#8A5A00', Red: '#B0272B', Blue: '#0851A1' };
const RAG_BG = { Green: '#E6F4EA', Yellow: '#FFF4E0', Red: '#FCE8E8', Blue: '#EAF3FC' };
// What each milestone RAG status code actually means - shown in the badge instead of the raw
// color name (kept in sync with client/src/theme/theme.js's `ragMeanings`).
const RAG_MEANINGS = { Green: 'In Progress', Yellow: 'Not Started', Red: 'Critical Risk', Blue: 'Completed' };

// Optional org wordmark image, cropped to its tight bounding box (the source file may have
// generous white padding). Falls back to a plain text badge (see orgLogoHtml) if absent -
// drop a logo file at this path to have it picked up automatically.
// Outlook desktop (Windows) renders HTML message bodies through Word's engine, which does NOT
// support position:absolute/overflow:hidden CSS cropping tricks (nor CSS gradients, flexbox,
// border-radius or text-transform). So the crop is done for real, once, with jimp - producing a
// plain <img> that Word can render like any other client - instead of relying on CSS to hide
// the padding around the logo artwork.
const LOGO_PATH = path.join(__dirname, '..', '..', '..', '..', 'client', 'src', 'assets', 'org-logo.jpg');
const LOGO_CROP = { left: 82, top: 148, width: 519, height: 165 };
const LOGO_CID = 'orglogo';

let croppedLogoBufferPromise = null;
function loadCroppedLogoBuffer() {
  if (!croppedLogoBufferPromise) {
    croppedLogoBufferPromise = Jimp.read(LOGO_PATH)
      .then((img) => {
        img.crop({ x: LOGO_CROP.left, y: LOGO_CROP.top, w: LOGO_CROP.width, h: LOGO_CROP.height });
        return img.getBuffer('image/png');
      })
      .catch(() => null);
  }
  return croppedLogoBufferPromise;
}

/**
 * @param {number} heightPx rendered logo height in the email
 * @param {string} [srcOverride] when set (e.g. "cid:orglogo" for the Outlook COM draft, which
 *   can't reliably render base64 data-URI images), used instead of an inline base64 data URI.
 * @param {string} [orgName] admin-configured Settings.organizationName override.
 */
async function orgLogoHtml(heightPx, srcOverride, orgName = ORG_NAME) {
  const width = Math.round((LOGO_CROP.width / LOGO_CROP.height) * heightPx);
  const height = Math.round(heightPx);
  let src = srcOverride || '';
  if (!src) {
    const buffer = await loadCroppedLogoBuffer();
    src = buffer ? `data:image/png;base64,${buffer.toString('base64')}` : '';
  }
  if (!src) return `<span style="font-size:20px;font-weight:800;letter-spacing:.03em;">${escapeHtml(orgName)}</span>`;
  return `<img src="${src}" width="${width}" height="${height}" alt="${escapeHtml(orgName)}" style="display:block;border:0;outline:none;width:${width}px;height:${height}px;" />`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2br(value) {
  const escaped = escapeHtml(value);
  return escaped ? escaped.replace(/\n/g, '<br/>') : '-';
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function fmtDate(value) {
  if (!value) return 'TBD';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' });
}

function fmtDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

function ragBadge(code) {
  const color = RAG_COLORS[code] || TEXT_MUTED;
  const bg = RAG_BG[code] || '#EEF0F3';
  const label = RAG_MEANINGS[code] || code || '-';
  return `<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700;color:${color};background:${bg};">${escapeHtml(label)}</span>`;
}

function sectionTitle(text) {
  // Uppercased in JS, not via CSS text-transform - Outlook's Word rendering engine ignores
  // text-transform, which would otherwise show section titles in their original case there.
  return `<div style="margin:24px 0 10px;font-size:13px;font-weight:700;color:${TEXT_DARK};letter-spacing:.04em;border-bottom:2px solid ${TEXT_DARK};padding-bottom:6px;">${escapeHtml(String(text).toUpperCase())}</div>`;
}

// Same as sectionTitle but with a right-aligned, non-uppercased timestamp/meta string next to
// the heading. Uses a table (not flexbox) so it also renders correctly in Outlook's Word engine.
function sectionTitleWithMeta(text, meta) {
  return `
    <table role="presentation" style="width:100%;margin:24px 0 10px;border-bottom:2px solid ${TEXT_DARK};">
      <tr>
        <td style="padding-bottom:6px;font-size:13px;font-weight:700;color:${TEXT_DARK};letter-spacing:.04em;">${escapeHtml(String(text).toUpperCase())}</td>
        <td style="padding-bottom:6px;text-align:right;font-size:11.5px;font-weight:600;color:${TEXT_MUTED};white-space:nowrap;">${escapeHtml(meta)}</td>
      </tr>
    </table>`;
}

function fieldRow(label, value) {
  return `
    <tr>
      <td style="padding:7px 12px;border-bottom:1px solid ${BORDER_COLOR};font-size:13px;color:${TEXT_MUTED};width:180px;font-weight:600;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:7px 12px;border-bottom:1px solid ${BORDER_COLOR};font-size:13px;color:${TEXT_DARK};">${value}</td>
    </tr>`;
}

function dataTable(headers, rows) {
  if (!rows.length) {
    return `<div style="font-size:13px;color:${TEXT_MUTED};padding:6px 0;">None recorded.</div>`;
  }
  const thead = headers
    .map((h) => `<th style="text-align:left;padding:8px 10px;font-size:11px;letter-spacing:.02em;color:${TEXT_MUTED};background:#F7F8FA;border-bottom:1px solid ${BORDER_COLOR};">${escapeHtml(String(h).toUpperCase())}</th>`)
    .join('');
  const tbody = rows
    .map((cells) => `<tr>${cells.map((c) => `<td style="padding:8px 10px;font-size:13px;color:${TEXT_DARK};border-bottom:1px solid ${BORDER_COLOR};vertical-align:top;">${c}</td>`).join('')}</tr>`)
    .join('');
  return `<table style="width:100%;border-collapse:collapse;">${`<thead><tr>${thead}</tr></thead>`}<tbody>${tbody}</tbody></table>`;
}

/**
 * @param {{ project: object, latestUpdate: object|null, updates: object[], historyUpdates?: object[], milestones: object[], risks: object[], contacts: object[], emailFooter?: string }} data
 *   `historyUpdates` (defaults to `updates.slice(1)` when omitted) lets callers control exactly
 *   which prior updates count as "history" - needed when previewing an unsaved draft that will
 *   become a brand-new entry rather than replacing the current latest one. `emailFooter` should
 *   be the live Settings.emailFooter value (falls back to a generic default if not supplied).
 * @param {{ logoSrc?: string }} [opts] pass `{ logoSrc: 'cid:orglogo' }` when this HTML will be
 *   used as an Outlook COM draft's HTMLBody (paired with an inline `orglogo` attachment) since
 *   that renderer can't reliably display base64 data-URI images.
 * @returns {Promise<string>} full standalone HTML document
 */
async function buildCommunicationHtml(
  { project, latestUpdate, updates = [], historyUpdates, milestones = [], risks = [], contacts = [], emailFooter, orgName = ORG_NAME, tagline = TAGLINE },
  opts = {}
) {
  const milestoneRows = milestones.map((m) => [
    escapeHtml(m.phase),
    fmtDate(m.baselineStartDate),
    fmtDate(m.forecastActualStartDate),
    fmtDate(m.baselineEndDate),
    fmtDate(m.forecastActualEndDate),
    ragBadge(m.status),
  ]);

  const riskRows = risks.map((r) => [
    escapeHtml(r.riskIssue),
    fmtDate(r.dateRaised),
    escapeHtml(r.description),
    escapeHtml(r.impact),
    escapeHtml(r.owner || '-'),
    escapeHtml(r.status),
    escapeHtml(r.mitigationRemarks || '-'),
  ]);

  const contactRows = contacts.map((c) => [
    escapeHtml(c.name),
    escapeHtml(c.role || '-'),
    escapeHtml(c.email || '-'),
    escapeHtml(c.contactNumber || '-'),
    escapeHtml(c.company || '-'),
  ]);

  const historyEntries = (historyUpdates ?? updates.slice(1))
    .map(
      (u) => `
      <li style="margin-bottom:14px;">
        <div style="font-size:12.5px;font-weight:700;color:${TEXT_DARK};">${fmtDateTime(u.createdAt)}</div>
        <div style="font-size:13px;color:${TEXT_DARK};margin-top:3px;">${nl2br(u.currentUpdate)}</div>
        <div style="font-size:12.5px;color:${TEXT_MUTED};margin-top:3px;"><strong>Next Steps:</strong> ${nl2br(u.nextSteps)}</div>
      </li>`
    )
    .join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(project.prId)} - Project Status Report</title>
  </head>
  <body style="margin:0;padding:0;background:#F4F6F8;font-family:'Segoe UI', Arial, sans-serif;">
    <table role="presentation" style="width:100%;background:#F4F6F8;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" style="width:100%;max-width:680px;background:#FFFFFF;border-radius:10px;overflow:hidden;border:1px solid ${BORDER_COLOR};">
            <tr>
              <td style="padding:20px 28px;background-color:${HEADER_GREEN_FROM};background-image:linear-gradient(135deg, ${HEADER_GREEN_FROM}, ${HEADER_GREEN_TO});color:#fff;" bgcolor="${HEADER_GREEN_FROM}">
                <table role="presentation" style="width:100%;"><tr>
                  <td style="vertical-align:middle;">
                    <table role="presentation"><tr>
                      <td style="vertical-align:middle;">${await orgLogoHtml(26, opts.logoSrc, orgName)}</td>
                      <td style="vertical-align:middle;padding-left:14px;font-size:17px;font-weight:800;letter-spacing:.01em;">${escapeHtml(tagline)}</td>
                    </tr></table>
                  </td>
                  <td style="text-align:right;font-size:11px;opacity:.85;vertical-align:top;">Confidential</td>
                </tr></table>
                <div style="font-size:15px;font-weight:600;margin-top:6px;">Project Status Report</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 28px;">
                <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:4px;">
                  ${fieldRow('PR ID', escapeHtml(project.prId))}
                  ${fieldRow('Account Name', escapeHtml(project.accountName))}
                  ${fieldRow('Project Manager', escapeHtml(project.projectManager))}
                  ${fieldRow('Project Scope', nl2br(project.projectScope))}
                  ${fieldRow('Project Start Date', fmtDate(project.projectStartDate))}
                  ${fieldRow('Reporting Period Start Date', fmtDate(project.reportingPeriodStartDate))}
                  ${fieldRow('Reporting Period End Date', fmtDate(project.reportingPeriodEndDate))}
                  ${fieldRow('Project Status', escapeHtml(project.projectStage))}
                </table>

                ${sectionTitleWithMeta('Latest Update', latestUpdate?.createdAt ? fmtDateTime(latestUpdate.createdAt) : '')}
                <div style="font-size:13px;color:${TEXT_DARK};margin-bottom:6px;">${nl2br(latestUpdate?.currentUpdate)}</div>
                <div style="font-size:12.5px;color:${TEXT_MUTED};"><strong>Next Steps:</strong> ${nl2br(latestUpdate?.nextSteps)}</div>

                ${sectionTitle('Risk / Dependencies Tracker')}
                ${dataTable(['Risk/Issue', 'Date Raised', 'Description', 'Impact', 'Owner', 'Status', 'Mitigation/Action Remarks'], riskRows)}

                ${sectionTitle('Project Milestones')}
                ${dataTable(['Phase', 'Baseline Start Date', 'Forecast/Actual Start Date', 'Baseline End Date', 'Forecast/Actual End Date', 'Status'], milestoneRows)}

                ${sectionTitle('Key Contacts / Stakeholders')}
                ${dataTable(['Name', 'Role', 'Email', 'Contact No.', 'Company'], contactRows)}

                ${historyEntries ? `${sectionTitle('History')}<ul style="margin:0;padding-left:18px;">${historyEntries}</ul>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#F7F8FA;border-top:1px solid ${BORDER_COLOR};font-size:11.5px;color:${TEXT_MUTED};">
                ${emailFooter ? nl2br(emailFooter) : `This is an automated project status communication from the ${escapeHtml(orgName)} PSR Communication Tool. Please do not share outside authorized stakeholders.`}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildCommunicationSubject(project) {
  return `PSR Update: ${project.prId} - ${project.accountName}`;
}

module.exports = { buildCommunicationHtml, buildCommunicationSubject, getLogoPngBuffer: loadCroppedLogoBuffer, LOGO_CID };
