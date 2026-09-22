import { useEffect, useState } from 'react';
import { Button, Dropdown, Option, Spinner } from '@fluentui/react-components';
import {
  ArrowDownload24Regular,
  Folder24Regular,
  Flag24Regular,
  Warning24Regular,
  ShieldError24Regular,
} from '@fluentui/react-icons';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import api from '../../api/client.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import html2pdf from 'html2pdf.js';

const COLOR = {
  ink: '#101828',
  slateDark: '#334155',
  slate: '#5B6472',
  slateMid: '#8A93A3',
  slateLight: '#CBD3DC',
  fillLight: '#F1F3F6',
  border: '#E3E7ED',
};

// Chart colors follow the standard status legend: gray = not started, green = on track,
// yellow = at risk, red = critical/blocked, blue = completed.
const STAGE_SHADES = {
  Initiation: '#9AA5B1',
  Planning: '#9AA5B1',
  'In Progress': '#1E9E4A',
  'On Hold': '#F2B705',
  Completed: '#0B6FCE',
  Closed: '#5B6472',
};
const RAG_SHADES = { Green: '#1E9E4A', Yellow: '#F2B705', Red: '#E23E3E', Blue: '#0B6FCE' };

const STAT_CARDS = [
  { key: 'totalProjects', label: 'Total Projects', icon: Folder24Regular },
  { key: 'totalMilestones', label: 'Total Milestones', icon: Flag24Regular },
  { key: 'overdueMilestones', label: 'Overdue Milestones', icon: Warning24Regular },
  { key: 'totalOpenRisks', label: 'Open Risks', icon: ShieldError24Regular },
];

const tooltipStyle = { fontSize: 12.5, borderRadius: 8, border: `1px solid ${COLOR.border}`, boxShadow: '0 4px 14px rgba(15,44,87,0.08)' };
const axisTick = { fontSize: 12, fill: COLOR.slate };

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/reports/summary'), api.get('/projects')])
      .then(([summaryRes, projectsRes]) => {
        setSummary(summaryRes.data);
        setProjects(projectsRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDownload() {
    if (!selectedProject) return;
    setDownloading(true);
    let mountNode;
    let container;
    try {
      // Reuse the exact HTML the Send Communication preview renders, then export it to PDF in
      // the browser so the downloaded PDF matches the preview's layout, fonts and styling.
      const res = await api.post(`/projects/${selectedProject}/communication-preview`, {});
      const project = projects.find((p) => p._id === selectedProject);

      const body = new DOMParser().parseFromString(res.data.html, 'text/html').body;
      // The element html2pdf captures must be in normal document flow: html2pdf clones it and
      // measures the clone's height. A `position:fixed/absolute` element is out of flow and
      // measures as ~0 tall, producing an empty PDF (or, with a pinned height, a clipped tail
      // once page breaks grow the content). So `container` stays static/in-flow and a separate
      // off-screen `mountNode` wrapper is what actually keeps it hidden from the user.
      container = document.createElement('div');
      container.style.cssText = 'width:720px;padding:16px;background:#F4F6F8;';
      container.innerHTML = body.innerHTML;

      // Group each section heading with the table/list/text that follows it so a page break can
      // never strand a heading (or a table's column headers) at the foot of a page — the whole
      // block moves to the next page together. Section headings in the template carry a
      // `border-bottom:2px solid #101828`, which is what identifies them here.
      const contentCell = container.querySelector('td[style*="padding:24px 28px 28px"]');
      if (contentCell) {
        const isHeading = (el) =>
          el.nodeType === 1 && /border-bottom:\s*2px solid #101828/i.test(el.getAttribute('style') || '');
        const nodes = Array.from(contentCell.children);
        let i = 0;
        while (i < nodes.length) {
          if (isHeading(nodes[i])) {
            const wrapper = document.createElement('div');
            wrapper.className = 'pcp-pdf-section';
            wrapper.style.pageBreakInside = 'avoid';
            wrapper.style.breakInside = 'avoid';
            contentCell.insertBefore(wrapper, nodes[i]);
            let j = i;
            do {
              wrapper.appendChild(nodes[j]);
              j += 1;
            } while (j < nodes.length && !isHeading(nodes[j]));
            i = j;
          } else {
            i += 1;
          }
        }
      }

      mountNode = document.createElement('div');
      mountNode.style.cssText = 'position:fixed;left:-10000px;top:0;pointer-events:none;';
      mountNode.appendChild(container);
      document.body.appendChild(mountNode);

      // Wait for the embedded (base64) logo so it isn't missing in the captured PDF.
      await Promise.all(
        Array.from(container.querySelectorAll('img')).map((img) =>
          img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })
        )
      );

      await html2pdf()
        .set({
          // Reserve vertical space on every page for the drawn header/footer and side padding
          // so nothing sits flush against the edges. [top, left, bottom, right] in points.
          margin: [64, 24, 64, 24],
          filename: `${project?.prId || 'psr'}-status-report.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#F4F6F8',
            // No explicit width/height: the container is in normal flow, so html2canvas
            // auto-measures the full page-break-grown content (no empty capture, no clipped tail).
          },
          jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
          // Keep each atomic record (history item, table row) whole, and keep each section
          // (heading + its table/list) together so headings and column headers never get
          // stranded at the bottom of a page — the block moves to the next page instead.
          pagebreak: { mode: ['css', 'legacy'], avoid: ['li', 'tbody tr', '.pcp-pdf-section'] },
        })
        .from(container)
        .toPdf()
        .get('pdf')
        .then((pdf) => {
          // Draw a consistent header and footer on every page inside the reserved margins.
          const pageCount = pdf.internal.getNumberOfPages();
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const marginX = 24;
          const generatedOn = new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
          });
          for (let i = 1; i <= pageCount; i += 1) {
            pdf.setPage(i);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(120, 130, 145);
            pdf.text('Confidential', pageWidth - marginX, 34, { align: 'right' });
            pdf.setDrawColor(227, 231, 237);
            pdf.setLineWidth(0.5);
            pdf.line(marginX, 44, pageWidth - marginX, 44);

            pdf.line(marginX, pageHeight - 40, pageWidth - marginX, pageHeight - 40);
            pdf.setFontSize(8);
            pdf.setTextColor(120, 130, 145);
            pdf.text(`${project?.prId || ''}  ·  Generated ${generatedOn}`, marginX, pageHeight - 26);
            pdf.text(`Page ${i} of ${pageCount}`, pageWidth - marginX, pageHeight - 26, { align: 'right' });
          }
        })
        .save();
    } catch {
      // silent — the button stays enabled so the PM can retry
    } finally {
      if (mountNode) mountNode.remove();
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <Spinner label="Loading reports..." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Reports" subtitle="Portfolio-wide analytics and exportable PSR status reports." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {STAT_CARDS.map(({ key, label, icon, tone }) => (
          <StatCard key={key} label={label} value={summary[key]} icon={icon} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 20, marginBottom: 20 }}>
        <section className="pcp-card" style={{ padding: 24 }}>
          <div className="pcp-section-title">Projects by Stage</div>
          {summary.byStage.length ? (
            <ResponsiveContainer width="100%" height={Math.max(220, summary.byStage.length * 52)}>
              <BarChart data={summary.byStage} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={COLOR.border} />
                <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={{ stroke: COLOR.border }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12.5, fill: COLOR.ink }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: COLOR.fillLight }} contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                  {summary.byStage.map((entry) => (
                    <Cell key={entry.name} fill={STAGE_SHADES[entry.name] || COLOR.slateDark} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No project data yet" message="Create PSRs to see stage distribution." />
          )}
        </section>

        <section className="pcp-card" style={{ padding: 24 }}>
          <div className="pcp-section-title">Milestone Health</div>
          {summary.totalMilestones ? (
            <>
              <div style={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={summary.byRag} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={3} stroke="none">
                      {summary.byRag.map((entry) => (
                        <Cell key={entry.name} fill={RAG_SHADES[entry.name] || COLOR.slateMid} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: COLOR.ink }}>{summary.totalMilestones}</div>
                  <div style={{ fontSize: 11, color: 'var(--pcp-text-secondary)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Milestones</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 10, flexWrap: 'wrap' }}>
                {summary.byRag.map((entry) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: COLOR.slateDark }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: RAG_SHADES[entry.name] || COLOR.slateMid, flexShrink: 0, border: `1px solid ${COLOR.border}` }} />
                    {entry.name} &middot; {entry.value}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="No milestone data yet" message="Add milestones to see RAG health." />
          )}
        </section>
      </div>

      <section className="pcp-card" style={{ padding: 24 }}>
        <div className="pcp-section-title">Export Project Status Report</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 320 }}>
            <Dropdown
              placeholder="Select a project"
              value={selectedProject ? `${projects.find((p) => p._id === selectedProject)?.prId} - ${projects.find((p) => p._id === selectedProject)?.accountName}` : ''}
              selectedOptions={selectedProject ? [selectedProject] : []}
              onOptionSelect={(e, d) => setSelectedProject(d.optionValue)}
            >
              {projects.map((p) => (
                <Option key={p._id} value={p._id}>{p.prId} - {p.accountName}</Option>
              ))}
            </Dropdown>
          </div>
          <Button appearance="primary" icon={<ArrowDownload24Regular />} onClick={handleDownload} disabled={!selectedProject || downloading}>
            {downloading ? 'Preparing...' : 'Download PDF Report'}
          </Button>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="pcp-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLOR.fillLight, color: COLOR.slateDark, flexShrink: 0 }}>
        {Icon && <Icon fontSize={22} />}
      </div>
      <div>
        <div style={{ fontSize: 11.5, color: 'var(--pcp-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: COLOR.ink, lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  );
}
