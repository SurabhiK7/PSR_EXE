import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Spinner, Button, TabList, Tab } from '@fluentui/react-components';
import { Edit24Regular, Delete24Regular, Document24Regular, Mail24Regular } from '@fluentui/react-icons';
import api from '../../api/client.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import PreviewCommunicationDialog from './PreviewCommunicationDialog.jsx';
import { formatDate, formatDateTime } from '../../utils/format.js';
import { ORG_NAME } from '../../config/branding.js';

const TABS = [
  { key: 'info', label: 'Project Information' },
  { key: 'update', label: 'Latest Update' },
  { key: 'milestones', label: 'Project Milestones' },
  { key: 'risks', label: 'Risks / Dependencies' },
  { key: 'contacts', label: 'Key Contacts / Stakeholders' },
  { key: 'attachments', label: 'Attachments' },
];

/**
 * Read-only "View PSR" screen. All editing happens through the Update PSR wizard;
 * this page only displays what's on file for the project.
 */
export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [risks, setRisks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [commOpen, setCommOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/updates`),
      api.get(`/projects/${id}/milestones`),
      api.get(`/projects/${id}/risks`),
      api.get(`/projects/${id}/contacts`),
      api.get(`/projects/${id}/documents`),
    ])
      .then(([p, u, m, r, c, d]) => {
        setProject(p.data);
        setUpdates(u.data);
        setMilestones(m.data);
        setRisks(r.data);
        setContacts(c.data);
        setDocuments(d.data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <Spinner label="Loading project..." />
      </div>
    );
  }

  if (notFound || !project) {
    return <EmptyState title="Project not found" message="This project may have been removed." />;
  }

  const latestUpdate = updates[0] || null;
  const orgContacts = contacts.filter((c) => c.group === ORG_NAME);
  const externalContacts = contacts.filter((c) => c.group === 'External');

  return (
    <div>
      <PageHeader
        title={`${project.prId} — ${project.accountName}`}
        subtitle="Read-only project status report. Use Update PSR to make changes."
        actions={
          <>
            <Button icon={<Mail24Regular />} onClick={() => setCommOpen(true)}>Send Communication</Button>
            <Button icon={<Edit24Regular />} onClick={() => navigate(`/update-psr/${project._id}`)}>Update PSR</Button>
            <Button icon={<Delete24Regular />} onClick={() => navigate(`/delete-psr?id=${project._id}`)}>Delete PSR</Button>
          </>
        }
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatusBadge value={project.projectStage} type="stage" size="large" />
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '5px 14px',
            borderRadius: 999,
            background: project.status === 'Submitted' ? '#E6F4EA' : '#FFF4E0',
            color: project.status === 'Submitted' ? '#0E7A2E' : '#8A5A00',
          }}
        >
          {project.status || 'Draft'}
        </span>
      </div>

      <div className="pcp-card" style={{ padding: '4px 16px', marginBottom: 20 }}>
        <TabList selectedValue={activeTab} onTabSelect={(e, data) => setActiveTab(data.value)}>
          {TABS.map((t) => (
            <Tab key={t.key} value={t.key}>{t.label}</Tab>
          ))}
        </TabList>
      </div>

      {activeTab === 'info' && (
        <section className="pcp-card" style={{ padding: 24 }}>
          <div className="pcp-section-title">Project Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px 24px' }}>
            <InfoField label="PR-ID" value={project.prId} link />
            <InfoField label="Account Name" value={project.accountName} />
            <InfoField label="Project Manager" value={project.projectManager} />
            <InfoField label="Project Start Date" value={formatDate(project.projectStartDate)} />
            <InfoField label="Project Stage" value={<StatusBadge value={project.projectStage} type="stage" />} />
            <InfoField label="Last Updated" value={`${formatDate(project.lastUpdatedDate)} by ${project.lastUpdatedBy || '—'}`} />
          </div>
          {project.projectScope && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12, color: 'var(--pcp-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Project Scope</div>
              <div style={{ fontSize: 13.5, color: '#1F2937', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{project.projectScope}</div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'update' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="pcp-card" style={{ padding: 24 }}>
            <div className="pcp-section-title">Latest Update / MoM</div>
            {latestUpdate ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <ReadField label="Current Update" value={latestUpdate.currentUpdate} />
                <ReadField label="Next Steps" value={latestUpdate.nextSteps} />
                <ReadField label="Any Risks / Dependencies" value={latestUpdate.risksDependencies} />
                <div style={{ fontSize: 12, color: 'var(--pcp-text-secondary)' }}>
                  {latestUpdate.isDraft ? 'Draft' : 'Published'} · Last saved {formatDateTime(latestUpdate.updatedAt || latestUpdate.createdAt)}
                </div>
              </div>
            ) : (
              <EmptyState title="No updates available" message="Updates from the Update PSR wizard will appear here." />
            )}
          </section>

          <section className="pcp-card" style={{ padding: 24 }}>
            <div className="pcp-section-title">Update History</div>
            <div className="pcp-table-wrapper">
              {updates.length ? (
                <table className="pcp-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Status</th>
                      <th>Update Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {updates.map((u) => (
                      <tr key={u._id}>
                        <td>{formatDateTime(u.createdAt)}</td>
                        <td>{u.isDraft ? 'Draft' : 'Published'}</td>
                        <td>{(u.currentUpdate || '').slice(0, 140) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="No updates available" message="Updates will appear here once saved." />
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'milestones' && (
        <section className="pcp-card" style={{ padding: 24 }}>
          <div className="pcp-section-title">Project Milestones</div>
          <div className="pcp-table-wrapper">
            {milestones.length ? (
              <table className="pcp-table">
                <thead>
                  <tr>
                    <th>Milestone</th>
                    <th>Baseline Schedule</th>
                    <th>Actual Schedule</th>
                    <th>Status</th>
                    <th>Project Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m) => (
                    <tr key={m._id}>
                      <td style={{ fontWeight: 600 }}>{m.milestoneName}</td>
                      <td>{formatDate(m.baselineSchedule)}</td>
                      <td>{formatDate(m.actualSchedule)}</td>
                      <td><StatusBadge value={m.statusCode} type="rag" /></td>
                      <td>{m.projectStage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="No milestones available" message="Milestones added via Update PSR will appear here." />
            )}
          </div>
        </section>
      )}

      {activeTab === 'risks' && (
        <section className="pcp-card" style={{ padding: 24 }}>
          <div className="pcp-section-title">Risks & Dependencies</div>
          <div className="pcp-table-wrapper">
            {risks.length ? (
              <table className="pcp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Impact</th>
                    <th>Owner</th>
                    <th>Mitigation</th>
                  </tr>
                </thead>
                <tbody>
                  {risks.map((r) => (
                    <tr key={r._id}>
                      <td>{formatDate(r.date)}</td>
                      <td>{r.description}</td>
                      <td><StatusBadge value={r.impact} type="impact" /></td>
                      <td>{r.owner || '—'}</td>
                      <td>{r.mitigation || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="No risks or dependencies recorded" message="Risks added via Update PSR will appear here." />
            )}
          </div>
        </section>
      )}

      {activeTab === 'contacts' && (
        <section className="pcp-card" style={{ padding: 24 }}>
          <div className="pcp-section-title">Key Contacts & Stakeholders</div>
          <ContactTable title={ORG_NAME} contacts={orgContacts} />
          <div style={{ height: 20 }} />
          <ContactTable title="External" contacts={externalContacts} />
        </section>
      )}

      {activeTab === 'attachments' && (
        <section className="pcp-card" style={{ padding: 24 }}>
          <div className="pcp-section-title">Attachments</div>
          <div className="pcp-table-wrapper">
            {documents.length ? (
              <table className="pcp-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Uploaded By</th>
                    <th>Upload Date</th>
                    <th>File Type</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d._id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                        <Document24Regular style={{ color: 'var(--pcp-brand)' }} />
                        {d.documentName}
                      </td>
                      <td>{d.uploadedBy}</td>
                      <td>{formatDate(d.uploadDate)}</td>
                      <td>{d.fileType}</td>
                      <td>
                        <Button size="small" as="a" href={`/api/documents/${d._id}/download`}>Download</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="No attachments uploaded" message="Documents added via Update PSR will appear here." />
            )}
          </div>
        </section>
      )}

      <PreviewCommunicationDialog open={commOpen} onOpenChange={setCommOpen} project={project} />
    </div>
  );
}

function InfoField({ label, value, link }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--pcp-text-secondary)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</div>
      <div className={link ? 'pcp-link-id' : ''} style={{ fontSize: 14, fontWeight: 600, color: link ? undefined : '#101828' }}>{value || '—'}</div>
    </div>
  );
}

function ReadField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--pcp-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</div>
      <div style={{ fontSize: 13.5, color: '#1F2937', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{value || '—'}</div>
    </div>
  );
}

function ContactTable({ title, contacts }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#101828', marginBottom: 10 }}>{title}</div>
      <div className="pcp-table-wrapper">
        {contacts.length ? (
          <table className="pcp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Contact Number</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c._id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.role || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.contactNumber || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title={`No ${title} contacts`} message={`${title} contacts added via Update PSR will appear here.`} />
        )}
      </div>
    </div>
  );
}
