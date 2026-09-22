import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Field, Input, Textarea, Badge } from '@fluentui/react-components';
import { Search24Regular, Delete24Regular } from '@fluentui/react-icons';
import api from '../../api/client.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { formatDate } from '../../utils/format.js';
import { ORG_NAME } from '../../config/branding.js';

export default function DeletePSR() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const idFromQuery = searchParams.get('id');

  const [prId, setPrId] = useState('');
  const [project, setProject] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (idFromQuery) {
      api
        .get(`/projects/${idFromQuery}`)
        .then((res) => setProject(res.data))
        .catch(() => setError('Could not load that project.'));
    }
  }, [idFromQuery]);

  async function handleFetch() {
    if (!prId.trim()) {
      setError('Enter a PR-ID to continue.');
      return;
    }
    setFetching(true);
    setError('');
    try {
      const res = await api.get(`/projects/by-pr/${encodeURIComponent(prId.trim())}`);
      setProject(res.data);
    } catch (err) {
      setProject(null);
      setError(err.response?.data?.message || 'No project found for that PR-ID.');
    } finally {
      setFetching(false);
    }
  }

  async function handleDelete() {
    if (!reason.trim()) {
      setError('Please enter a reason for deletion.');
      return;
    }
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/projects/${project._id}`, { data: { reason: reason.trim(), deletedBy: project.projectManager } });
      navigate('/projects');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete the project.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Delete PSR" subtitle="Permanently remove a project that is no longer needed." />

      {!project && (
        <div className="pcp-card" style={{ padding: 24, maxWidth: 520 }}>
          {error && (
            <div style={{ marginBottom: 16 }}>
              <Badge appearance="tint" color="danger" size="large">{error}</Badge>
            </div>
          )}
          <Field label="PR-ID" required>
            <Input
              contentBefore={<Search24Regular />}
              placeholder={`e.g. ${ORG_NAME}-2026-0001`}
              value={prId}
              onChange={(e, d) => setPrId(d.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            />
          </Field>
          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
            <Button appearance="primary" onClick={handleFetch} disabled={fetching}>
              {fetching ? 'Fetching...' : 'Fetch'}
            </Button>
          </div>
        </div>
      )}

      {project && (
        <div className="pcp-card" style={{ padding: 24, maxWidth: 620 }}>
          <div style={{ padding: '12px 16px', background: '#FCE8E8', border: '1px solid #EFA6A8', borderRadius: 8, color: '#B0272B', fontSize: 13.5, marginBottom: 20 }}>
            You are about to delete the project associated with this PR-ID. This action cannot be undone. Please confirm to proceed.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px 24px', marginBottom: 20 }}>
            <InfoField label="PR-ID" value={project.prId} />
            <InfoField label="Account Name" value={project.accountName} />
            <InfoField label="Project Manager" value={project.projectManager} />
            <InfoField label="Project Status" value={<StatusBadge value={project.projectStage} type="stage" />} />
            <InfoField label="Project Start Date" value={formatDate(project.projectStartDate)} />
          </div>

          {error && (
            <div style={{ marginBottom: 16 }}>
              <Badge appearance="tint" color="danger" size="large">{error}</Badge>
            </div>
          )}

          <Field label="Reason for Deletion" required>
            <Textarea value={reason} onChange={(e, d) => setReason(d.value)} rows={3} placeholder="Explain why this project is being deleted..." disabled={deleting} />
          </Field>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={() => { setProject(null); setReason(''); setError(''); }} disabled={deleting}>Cancel</Button>
            <Button appearance="primary" style={{ background: '#B0272B' }} icon={<Delete24Regular />} onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--pcp-text-secondary)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#101828' }}>{value || '-'}</div>
    </div>
  );
}
