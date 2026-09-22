import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Field, Input, Badge } from '@fluentui/react-components';
import { Search24Regular } from '@fluentui/react-icons';
import api from '../api/client.js';
import PageHeader from '../components/common/PageHeader.jsx';
import PSRWizardPage from './PSRWizard/PSRWizardPage.jsx';
import { ORG_NAME } from '../config/branding.js';

export default function UpdatePSR() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prId, setPrId] = useState('');
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(false);

  if (id) {
    return <PSRWizardPage mode="update" projectId={id} />;
  }

  async function handleFetch() {
    if (!prId.trim()) {
      setError('Enter a PR-ID to continue.');
      return;
    }
    setFetching(true);
    setError('');
    try {
      const res = await api.get(`/projects/by-pr/${encodeURIComponent(prId.trim())}`);
      navigate(`/update-psr/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'No project found for that PR-ID.');
    } finally {
      setFetching(false);
    }
  }

  return (
    <div>
      <PageHeader title="Update PSR" subtitle="Enter the PR-ID of the project you want to update." />
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
    </div>
  );
}
