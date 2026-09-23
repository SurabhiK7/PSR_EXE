const PDFDocument = require('pdfkit');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { ORG_NAME, TAGLINE } = require('../../config/branding');

const BRAND_COLOR = '#0B6FCE';
// Matches the teal-green accent used in the app sidebar/logo wordmark.
const HEADER_GREEN_FROM = '#01A982';
const HEADER_GREEN_TO = '#017D63';
const TEXT_MUTED = '#5B6472';
const TEXT_DARK = '#101828';
const BORDER_COLOR = '#E3E7ED';
const HEADER_BG = '#F7F8FA';

const RAG_COLORS = { Green: '#0E7A2E', Yellow: '#8A5A00', Red: '#B0272B' };
const RAG_BG = { Green: '#E6F4EA', Yellow: '#FFF4E0', Red: '#FCE8E8' };

// Optional org wordmark image, same path convention as the communication template. Falls back
// to a plain header title (no logo) if the file isn't present.
const LOGO_PATH = path.join(__dirname, '..', '..', '..', '..', 'client', 'src', 'assets', 'org-logo.jpg');
const LOGO_IMG_W = 690;
const LOGO_IMG_H = 458;
const LOGO_CROP = { left: 82, top: 148, width: 519, height: 165 };
let logoExists = false;
try {
  logoExists = fs.existsSync(LOGO_PATH);
} catch (err) {
  logoExists = false;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function fmtDate(value) {
  if (!value) return 'TBD';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' });
}

function fmtDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  return `${d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}, ${timePart}`;
}

/**
 * Builds a plain-text/structured representation of the project status report.
 * Shared by the PDF generator and can be reused for any other text rendering.
 */
function buildReportData({ project, latestUpdate, updates, milestones, risks, contacts }) {
  return {
    title: `Project Status Report`,
    project,
    latestUpdate,
    updates: updates || [],
    milestones: milestones || [],
    risks: risks || [],
    contacts: contacts || [],
  };
}

/**
 * Renders the project status report as a PDF, using the same section layout, field labels,
 * order and branding as the HTML "Preview Communication" template, and returns the file path.
 * Caller is responsible for deleting the file once it's no longer needed.
 */
function generateReportPdf(data) {
  return new Promise((resolve, reject) => {
    const { project, latestUpdate, updates = [], milestones = [], risks = [], contacts = [], emailFooter, orgName = ORG_NAME, tagline = TAGLINE } = data;
    const filePath = path.join(os.tmpdir(), `pcp-report-${crypto.randomUUID()}.pdf`);
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageLeft = doc.page.margins.left;
    const pageWidth = doc.page.width - pageLeft - doc.page.margins.right;
    const bottomLimit = doc.page.height - doc.page.margins.bottom;

    function ensureSpace(height) {
      if (doc.y + height > bottomLimit) doc.addPage();
    }

    function sectionTitle(text, meta) {
      ensureSpace(30);
      doc.moveDown(0.9);
      const y = doc.y;
      const titleHeight = doc.heightOfString(text.toUpperCase(), { width: pageWidth * 0.6, fontSize: 11, font: 'Helvetica-Bold', characterSpacing: 0.4 });
      doc.fontSize(11).font('Helvetica-Bold').fillColor(TEXT_DARK).text(text.toUpperCase(), pageLeft, y, { width: pageWidth * 0.6, characterSpacing: 0.4 });
      if (meta) {
        doc.fontSize(9).font('Helvetica').fillColor(TEXT_MUTED).text(meta, pageLeft, y + 2, { width: pageWidth, align: 'right' });
      }
      doc.y = y + titleHeight;
      const lineY = doc.y + 4;
      doc.moveTo(pageLeft, lineY).lineTo(pageLeft + pageWidth, lineY).lineWidth(1.5).strokeColor(TEXT_DARK).stroke();
      doc.y = lineY + 10;
      doc.fillColor(TEXT_DARK).font('Helvetica');
    }

    function fieldRow(label, value) {
      const labelWidth = 170;
      const valueWidth = pageWidth - labelWidth - 12;
      const height = Math.max(
        doc.heightOfString(label, { width: labelWidth, font: 'Helvetica-Bold', fontSize: 10 }),
        doc.heightOfString(value || '-', { width: valueWidth, fontSize: 10 })
      ) + 10;
      ensureSpace(height);
      const y = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(TEXT_MUTED).text(label, pageLeft, y + 5, { width: labelWidth });
      doc.fontSize(10).font('Helvetica').fillColor(TEXT_DARK).text(value || '-', pageLeft + labelWidth + 12, y + 5, { width: valueWidth });
      doc.y = y + height;
      doc
        .moveTo(pageLeft, doc.y)
        .lineTo(pageLeft + pageWidth, doc.y)
        .lineWidth(0.5)
        .strokeColor(BORDER_COLOR)
        .stroke();
      doc.fillColor(TEXT_DARK);
    }

    // Renders a simple bordered table; `columns` is [{ header, width, render(row) => string|{text,badge} }]
    function table(columns, rows) {
      if (!rows.length) {
        ensureSpace(20);
        doc.fontSize(10).font('Helvetica').fillColor(TEXT_MUTED).text('None recorded.', pageLeft, doc.y);
        doc.moveDown(0.4);
        doc.fillColor(TEXT_DARK);
        return;
      }

      function drawHeader() {
        const y = doc.y;
        doc.rect(pageLeft, y, pageWidth, 22).fill(HEADER_BG);
        let x = pageLeft;
        columns.forEach((col) => {
          doc
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .fillColor(TEXT_MUTED)
            .text(col.header.toUpperCase(), x + 8, y + 7, { width: col.width - 12, characterSpacing: 0.3 });
          x += col.width;
        });
        doc.y = y + 22;
        doc.fillColor(TEXT_DARK);
      }

      ensureSpace(22);
      drawHeader();

      rows.forEach((row) => {
        const cellTexts = columns.map((col) => col.render(row));
        const rowHeight =
          Math.max(
            ...columns.map((col, i) => {
              const text = typeof cellTexts[i] === 'string' ? cellTexts[i] : cellTexts[i].text;
              return doc.heightOfString(text, { width: col.width - 16, fontSize: 9 });
            })
          ) + 14;

        if (doc.y + rowHeight > bottomLimit) {
          doc.addPage();
          drawHeader();
        }

        const y = doc.y;
        let x = pageLeft;
        columns.forEach((col, i) => {
          const cell = cellTexts[i];
          if (cell && typeof cell === 'object' && cell.badge) {
            const bg = RAG_BG[cell.text] || '#EEF0F3';
            const color = RAG_COLORS[cell.text] || TEXT_MUTED;
            const badgeWidth = doc.widthOfString(cell.text, { fontSize: 8.5 }) + 16;
            doc.roundedRect(x + 8, y + 4, badgeWidth, 16, 8).fill(bg);
            doc.fontSize(8.5).font('Helvetica-Bold').fillColor(color).text(cell.text, x + 8, y + 8, { width: badgeWidth, align: 'center' });
          } else {
            const text = typeof cell === 'string' ? cell : cell.text;
            doc.fontSize(9).font('Helvetica').fillColor(TEXT_DARK).text(text, x + 8, y + 7, { width: col.width - 16 });
          }
          x += col.width;
        });
        doc.y = y + rowHeight;
        doc
          .moveTo(pageLeft, doc.y)
          .lineTo(pageLeft + pageWidth, doc.y)
          .lineWidth(0.5)
          .strokeColor(BORDER_COLOR)
          .stroke();
        doc.fillColor(TEXT_DARK);
      });
      doc.moveDown(0.3);
    }

    // --- Header banner (mirrors the green gradient banner in the email/preview template) ---
    const bannerHeight = 74;
    const gradient = doc.linearGradient(0, 0, doc.page.width, 0);
    gradient.stop(0, HEADER_GREEN_FROM).stop(1, HEADER_GREEN_TO);
    doc.rect(0, 0, doc.page.width, bannerHeight).fill(gradient);

    if (logoExists) {
      const scale = 20 / LOGO_CROP.height;
      const drawW = Math.round(LOGO_IMG_W * scale);
      const drawH = Math.round(LOGO_IMG_H * scale);
      doc.save();
      doc.rect(pageLeft, 18, Math.round(LOGO_CROP.width * scale), Math.round(LOGO_CROP.height * scale)).clip();
      doc.image(LOGO_PATH, pageLeft - Math.round(LOGO_CROP.left * scale), 18 - Math.round(LOGO_CROP.top * scale), { width: drawW, height: drawH });
      doc.restore();
    }
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#FFFFFF')
      .text(tagline, pageLeft + (logoExists ? 130 : 0), 22, { width: pageWidth - (logoExists ? 130 : 0) - 90 });
    doc.fontSize(8).font('Helvetica').fillColor('#FFFFFF').text('Confidential', doc.page.width - 130, 22, { width: 80, align: 'right' });
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#FFFFFF').text('Project Status Report', pageLeft + (logoExists ? 130 : 0), 44);

    doc.y = bannerHeight + 24;
    doc.fillColor(TEXT_DARK);

    // --- Project Information fields, matching the preview's field order ---
    fieldRow('PR ID', project.prId);
    fieldRow('Account Name', project.accountName);
    fieldRow('Project Manager', project.projectManager);
    fieldRow('Project Scope', project.projectScope);
    fieldRow('Project Start Date', fmtDate(project.projectStartDate));
    fieldRow('Reporting Period Start Date', fmtDate(project.reportingPeriodStartDate));
    fieldRow('Reporting Period End Date', fmtDate(project.reportingPeriodEndDate));
    fieldRow('Project Status', project.projectStage);

    sectionTitle('Latest Update', latestUpdate?.createdAt ? fmtDateTime(latestUpdate.createdAt) : '');
    ensureSpace(30);
    doc.fontSize(10).font('Helvetica').fillColor(TEXT_DARK).text(latestUpdate?.currentUpdate || '-', pageLeft, doc.y, { width: pageWidth });
    doc.moveDown(0.3);
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(TEXT_MUTED).text('Next Steps: ', pageLeft, doc.y, { continued: true, width: pageWidth });
    doc.font('Helvetica').text(latestUpdate?.nextSteps || '-');

    sectionTitle('Risk / Dependencies Tracker');
    table(
      [
        { header: 'Risk/Issue', width: pageWidth * 0.16, render: (r) => r.riskIssue || '-' },
        { header: 'Date Raised', width: pageWidth * 0.11, render: (r) => fmtDate(r.dateRaised) },
        { header: 'Description', width: pageWidth * 0.22, render: (r) => r.description || '-' },
        { header: 'Impact', width: pageWidth * 0.1, render: (r) => r.impact || '-' },
        { header: 'Owner', width: pageWidth * 0.12, render: (r) => r.owner || '-' },
        { header: 'Status', width: pageWidth * 0.1, render: (r) => r.status || '-' },
        { header: 'Mitigation/Action Remarks', width: pageWidth * 0.19, render: (r) => r.mitigationRemarks || '-' },
      ],
      risks
    );

    sectionTitle('Project Milestones');
    table(
      [
        { header: 'Phase', width: pageWidth * 0.24, render: (m) => m.phase || '-' },
        { header: 'Baseline Start', width: pageWidth * 0.16, render: (m) => fmtDate(m.baselineStartDate) },
        { header: 'Forecast/Actual Start', width: pageWidth * 0.18, render: (m) => fmtDate(m.forecastActualStartDate) },
        { header: 'Baseline End', width: pageWidth * 0.16, render: (m) => fmtDate(m.baselineEndDate) },
        { header: 'Forecast/Actual End', width: pageWidth * 0.16, render: (m) => fmtDate(m.forecastActualEndDate) },
        { header: 'Status', width: pageWidth * 0.1, render: (m) => ({ text: m.status || '-', badge: true }) },
      ],
      milestones
    );

    sectionTitle('Key Contacts / Stakeholders');
    table(
      [
        { header: 'Name', width: pageWidth * 0.24, render: (c) => c.name || '-' },
        { header: 'Role', width: pageWidth * 0.18, render: (c) => c.role || '-' },
        { header: 'Email', width: pageWidth * 0.28, render: (c) => c.email || '-' },
        { header: 'Contact No.', width: pageWidth * 0.16, render: (c) => c.contactNumber || '-' },
        { header: 'Company', width: pageWidth * 0.14, render: (c) => c.company || '-' },
      ],
      contacts
    );

    const historyUpdates = updates.slice(1);
    if (historyUpdates.length) {
      sectionTitle('History');
      const periodText = `${fmtDate(project.reportingPeriodStartDate)} - ${fmtDate(project.reportingPeriodEndDate)}`;
      historyUpdates.forEach((u) => {
        const updateText = u.currentUpdate || '-';
        const nextStepsText = u.nextSteps || '-';
        const height =
          14 +
          doc.heightOfString(periodText, { fontSize: 9.5 }) +
          doc.heightOfString(updateText, { width: pageWidth, fontSize: 10 }) +
          doc.heightOfString(`Next Steps: ${nextStepsText}`, { width: pageWidth, fontSize: 9.5 });
        ensureSpace(height);
        doc.fontSize(9.5).font('Helvetica-Bold').fillColor(TEXT_DARK).text(periodText, pageLeft, doc.y, { width: pageWidth });
        doc.fontSize(10).font('Helvetica').fillColor(TEXT_DARK).text(updateText, pageLeft, doc.y + 2, { width: pageWidth });
        doc.fontSize(9.5).font('Helvetica-Bold').fillColor(TEXT_MUTED).text('Next Steps: ', pageLeft, doc.y + 2, { continued: true, width: pageWidth });
        doc.font('Helvetica').text(nextStepsText);
        doc.moveDown(0.6);
        doc.fillColor(TEXT_DARK);
      });
    }

    // Footer disclaimer, same wording as the email/preview template
    ensureSpace(40);
    doc.moveDown(1);
    doc
      .fontSize(8.5)
      .font('Helvetica')
      .fillColor(TEXT_MUTED)
      .text(
        emailFooter || `This is an automated project status communication from the ${orgName} PSR Communication Tool. Please do not share outside authorized stakeholders.`,
        pageLeft,
        doc.y,
        { width: pageWidth }
      );

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

module.exports = { buildReportData, generateReportPdf };

