import { useEffect, useState } from 'react';
import { Button, Dropdown, Option, Spinner } from '@fluentui/react-components';
import { ArrowDownload24Regular } from '@fluentui/react-icons';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../api/client.js';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';

const RAG_COLORS = { Green: '#0E7A2E', Yellow: '#8A5A00', Red: '#B0272B' };
const IMPACT_COLORS = { Low: '#0E7A2E', Medium: '#8A5A00', High: '#B0272B', Critical: '#7A1418' };

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
    try {
      const res = await api.get(`/reports/projects/${selectedProject}/pdf`, { responseType: 'blob' });
      const project = projects.find((p) => p._id === selectedProject);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${project?.prId || 'psr'}-status-report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // silent — the button stays enabled so the PM can retry
    } finally {
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Projects" value={summary.totalProjects} />
        <StatCard label="Total Milestones" value={summary.totalMilestones} />
        <StatCard label="Overdue Milestones" value={summary.overdueMilestones} accent="#B0272B" />
        <StatCard label="Open Risks" value={summary.totalOpenRisks} accent="#8A5A00" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 24 }}>
        <section className="pcp-card" style={{ padding: 24 }}>
          <div className="pcp-section-title">Projects by Stage</div>
          {summary.byStage.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summary.byStage}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0B6FCE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No project data yet" message="Create PSRs to see stage distribution." />
          )}
        </section>

        <section className="pcp-card" style={{ padding: 24 }}>
          <div className="pcp-section-title">Milestone Health (RAG)</div>
          {summary.totalMilestones ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={summary.byRag} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {summary.byRag.map((entry) => (
                    <Cell key={entry.name} fill={RAG_COLORS[entry.name] || '#9CA3AF'} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No milestone data yet" message="Add milestones to see RAG health." />
          )}
        </section>

        <section className="pcp-card" style={{ padding: 24 }}>
          <div className="pcp-section-title">Risks by Impact</div>
          {summary.totalOpenRisks ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summary.byImpact} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {summary.byImpact.map((entry) => (
                    <Cell key={entry.name} fill={IMPACT_COLORS[entry.name] || '#9CA3AF'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No risk data yet" message="Add risks to see impact distribution." />
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

function StatCard({ label, value, accent }) {
  return (
    <div className="pcp-card" style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: 12, color: 'var(--pcp-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent || '#101828' }}>{value}</div>
    </div>
  );
}
