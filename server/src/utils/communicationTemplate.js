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

const BRAND_COLOR = '#0B6FCE';
const TEXT_MUTED = '#5B6472';
const TEXT_DARK = '#101828';
const BORDER_COLOR = '#E3E7ED';

const RAG_COLORS = { Green: '#0E7A2E', Yellow: '#8A5A00', Red: '#B0272B' };
const RAG_BG = { Green: '#E6F4EA', Yellow: '#FFF4E0', Red: '#FCE8E8' };

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
  return escaped ? escaped.replace(/\n/g, '<br/>') : '—';
}

function fmtDate(value) {
  if (!value) return 'TBD';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' });
}

function fmtDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

function ragBadge(code) {
  const color = RAG_COLORS[code] || TEXT_MUTED;
  const bg = RAG_BG[code] || '#EEF0F3';
  return `<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700;color:${color};background:${bg};">${escapeHtml(code || '—')}</span>`;
}

function sectionTitle(text) {
  return `<div style="margin:24px 0 10px;font-size:13px;font-weight:700;color:${BRAND_COLOR};text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid ${BRAND_COLOR};padding-bottom:6px;">${escapeHtml(text)}</div>`;
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
    .map((h) => `<th style="text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.02em;color:${TEXT_MUTED};background:#F7F8FA;border-bottom:1px solid ${BORDER_COLOR};">${escapeHtml(h)}</th>`)
    .join('');
  const tbody = rows
    .map((cells) => `<tr>${cells.map((c) => `<td style="padding:8px 10px;font-size:13px;color:${TEXT_DARK};border-bottom:1px solid ${BORDER_COLOR};vertical-align:top;">${c}</td>`).join('')}</tr>`)
    .join('');
  return `<table style="width:100%;border-collapse:collapse;">${`<thead><tr>${thead}</tr></thead>`}<tbody>${tbody}</tbody></table>`;
}

/**
 * @param {{ project: object, latestUpdate: object|null, updates: object[], milestones: object[], risks: object[], contacts: object[] }} data
 * @returns {string} full standalone HTML document
 */
function buildCommunicationHtml({ project, latestUpdate, updates = [], milestones = [], risks = [], contacts = [] }) {
  const milestoneRows = milestones.map((m) => [
    escapeHtml(m.milestoneName),
    fmtDate(m.baselineSchedule),
    fmtDate(m.actualSchedule),
    escapeHtml(m.projectStage || '—'),
    ragBadge(m.statusCode),
  ]);

  const riskRows = risks.map((r) => [
    fmtDate(r.date),
    escapeHtml(r.description),
    escapeHtml(r.impact),
    escapeHtml(r.owner || '—'),
    escapeHtml(r.mitigation || '—'),
  ]);

  const contactRows = contacts.map((c) => [
    escapeHtml(c.name),
    escapeHtml(c.role || '—'),
    escapeHtml(c.email || '—'),
    escapeHtml(c.contactNumber || '—'),
    escapeHtml(c.group),
  ]);

  const historyEntries = updates.length
    ? updates
        .map(
          (u) => `
      <li style="margin-bottom:14px;">
        <div style="font-size:12.5px;font-weight:700;color:${TEXT_DARK};">${fmtDateTime(u.createdAt)}${u.isDraft ? ' <span style="font-weight:600;color:' + TEXT_MUTED + ';">(Draft)</span>' : ''}</div>
        <div style="font-size:13px;color:${TEXT_DARK};margin-top:3px;">${nl2br(u.currentUpdate)}</div>
        <div style="font-size:12.5px;color:${TEXT_MUTED};margin-top:3px;"><strong>Next Steps:</strong> ${nl2br(u.nextSteps)}</div>
      </li>`
        )
        .join('')
    : `<div style="font-size:13px;color:${TEXT_MUTED};">None recorded.</div>`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(project.prId)} — Project Status Report</title>
  </head>
  <body style="margin:0;padding:0;background:#F4F6F8;font-family:'Segoe UI', Arial, sans-serif;">
    <table role="presentation" style="width:100%;background:#F4F6F8;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" style="width:100%;max-width:680px;background:#FFFFFF;border-radius:10px;overflow:hidden;border:1px solid ${BORDER_COLOR};">
            <tr>
              <td style="padding:20px 28px;background:linear-gradient(135deg, ${BRAND_COLOR}, #0851A1);color:#fff;">
                <div style="display:flex;justify-content:space-between;">
                  <table role="presentation" style="width:100%;"><tr>
                    <td style="font-size:20px;font-weight:800;letter-spacing:.03em;">VISTA</td>
                    <td style="text-align:right;font-size:11px;opacity:.85;">Confidential</td>
                  </tr></table>
                </div>
                <div style="font-size:15px;font-weight:600;margin-top:6px;">Project Status Report</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 28px;">
                <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:4px;">
                  ${fieldRow('Customer', escapeHtml(project.accountName))}
                  ${fieldRow('PR ID', escapeHtml(project.prId))}
                  ${fieldRow('Account Name', escapeHtml(project.accountName))}
                  ${fieldRow('Project Manager', escapeHtml(project.projectManager))}
                  ${fieldRow('Project Scope', nl2br(project.projectScope))}
                  ${fieldRow('Project Start Date', fmtDate(project.projectStartDate))}
                  ${fieldRow('Project Status', escapeHtml(project.projectStage))}
                </table>

                ${sectionTitle('Latest Update')}
                <div style="font-size:13px;color:${TEXT_DARK};margin-bottom:6px;">${nl2br(latestUpdate?.currentUpdate)}</div>
                <div style="font-size:12.5px;color:${TEXT_MUTED};"><strong>Next Steps:</strong> ${nl2br(latestUpdate?.nextSteps)}</div>
                <div style="font-size:12.5px;color:${TEXT_MUTED};margin-top:3px;"><strong>Risks / Dependencies:</strong> ${nl2br(latestUpdate?.risksDependencies)}</div>

                ${sectionTitle('Project Milestones')}
                ${dataTable(['Phase', 'Baseline Date', 'Forecast / Actual Date', 'Stage', 'Status'], milestoneRows)}

                ${sectionTitle('Risk / Dependencies Tracker')}
                ${dataTable(['Description', 'Date Raised', 'Impact', 'Owner', 'Mitigation / Action'], riskRows)}

                ${sectionTitle('Key Contacts / Stakeholders')}
                ${dataTable(['Name', 'Role', 'Email', 'Contact No.', 'Company'], contactRows)}

                ${sectionTitle('History')}
                <ul style="margin:0;padding-left:18px;">${historyEntries}</ul>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#F7F8FA;border-top:1px solid ${BORDER_COLOR};font-size:11.5px;color:${TEXT_MUTED};">
                This is an automated project status communication from VISTA. Please do not share outside authorized stakeholders.
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
  return `PSR Update: ${project.prId} — ${project.accountName}`;
}

module.exports = { buildCommunicationHtml, buildCommunicationSubject };
