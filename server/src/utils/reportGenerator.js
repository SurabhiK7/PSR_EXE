const PDFDocument = require('pdfkit');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { ORG_NAME } = require('../config/branding');

function fmtDate(value) {
  if (!value) return 'TBD';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' });
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
 * Renders the project status report as a PDF file on disk and returns the file path.
 * Caller is responsible for deleting the file once it's no longer needed.
 */
function generateReportPdf(data) {
  return new Promise((resolve, reject) => {
    const { project, latestUpdate, updates, milestones, risks, contacts } = data;
    const filePath = path.join(os.tmpdir(), `pcp-report-${crypto.randomUUID()}.pdf`);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const orgContacts = (contacts || []).filter((c) => c.group === ORG_NAME);
    const externalContacts = (contacts || []).filter((c) => c.group === 'External');

    function sectionTitle(text) {
      doc.moveDown(0.8);
      doc.fontSize(13).fillColor('#0B6FCE').font('Helvetica-Bold').text(text);
      doc.moveDown(0.3);
      doc.fillColor('#000000').font('Helvetica');
    }

    function labelValue(label, value) {
      doc.fontSize(10).font('Helvetica-Bold').text(`${label}: `, { continued: true });
      doc.font('Helvetica').text(value || '-');
    }

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#101828').text('Project Status Report');
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica').fillColor('#5B6472').text(`Generated on ${fmtDate(new Date())}`);
    doc.fillColor('#000000');

    sectionTitle('Project Information');
    labelValue('PR-ID', project.prId);
    labelValue('Account Name', project.accountName);
    labelValue('Project Manager', project.projectManager);
    labelValue('Project Stage', project.projectStage);
    labelValue('Project Start Date', fmtDate(project.projectStartDate));
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica-Bold').text('Project Scope:');
    doc.font('Helvetica').text(project.projectScope || '-');

    sectionTitle('Latest Update / MoM');
    if (latestUpdate) {
      doc.fontSize(10).font('Helvetica-Bold').text('Current Update:');
      doc.font('Helvetica').text(latestUpdate.currentUpdate || '-');
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').text('Next Steps:');
      doc.font('Helvetica').text(latestUpdate.nextSteps || '-');
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').text('Any Risks / Dependencies:');
      doc.font('Helvetica').text(latestUpdate.risksDependencies || '-');
    } else {
      doc.fontSize(10).text('No updates available.');
    }

    sectionTitle('Update History');
    if (updates && updates.length) {
      updates.forEach((u) => {
        doc.fontSize(9).font('Helvetica-Bold').text(fmtDate(u.createdAt), { continued: true });
        doc.font('Helvetica').text(`  -  ${(u.currentUpdate || '-').slice(0, 160)}`);
        doc.moveDown(0.15);
      });
    } else {
      doc.fontSize(10).text('No updates available.');
    }

    sectionTitle('Project Milestones');
    if (milestones && milestones.length) {
      milestones.forEach((m) => {
        doc.fontSize(9).font('Helvetica-Bold').text(m.milestoneName);
        doc
          .font('Helvetica')
          .text(
            `Baseline: ${fmtDate(m.baselineSchedule)}   Actual: ${fmtDate(m.actualSchedule)}   Status: ${m.statusCode}   Stage: ${m.projectStage}`
          );
        doc.moveDown(0.15);
      });
    } else {
      doc.fontSize(10).text('No milestones available.');
    }

    sectionTitle('Risks & Dependencies');
    if (risks && risks.length) {
      risks.forEach((r) => {
        doc.fontSize(9).font('Helvetica-Bold').text(`${fmtDate(r.date)} - ${r.impact} Impact`);
        doc.font('Helvetica').text(`Description: ${r.description}`);
        doc.text(`Owner: ${r.owner || '-'}   Mitigation: ${r.mitigation || '-'}`);
        doc.moveDown(0.15);
      });
    } else {
      doc.fontSize(10).text('No risks or dependencies recorded.');
    }

    sectionTitle('Key Contacts & Stakeholders');
    doc.fontSize(10).font('Helvetica-Bold').text(`${ORG_NAME} Contacts`);
    doc.font('Helvetica');
    if (orgContacts.length) {
      orgContacts.forEach((c) => doc.text(`${c.name} - ${c.role || '-'} - ${c.email || '-'} - ${c.contactNumber || '-'}`));
    } else {
      doc.text('No contacts available.');
    }
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').text('External Contacts');
    doc.font('Helvetica');
    if (externalContacts.length) {
      externalContacts.forEach((c) => doc.text(`${c.name} - ${c.role || '-'} - ${c.email || '-'} - ${c.contactNumber || '-'}`));
    } else {
      doc.text('No contacts available.');
    }

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

module.exports = { buildReportData, generateReportPdf };
