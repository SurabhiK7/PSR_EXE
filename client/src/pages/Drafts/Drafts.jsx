import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@fluentui/react-components';
import api from '../../api/client.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { formatDateTime } from '../../utils/format.js';

/**
 * Lists every unfinished draft across the app in one place:
 * - Projects started via "Create PSR" but never submitted (Project.status === 'Draft').
 * - "Latest Update" drafts saved from the wizard's Update step for existing projects,
 *   but not yet published.
 * Continuing a draft resumes the same wizard step it was saved from.
 */
export default function Drafts() {
  const navigate = useNavigate();
  const [projectDrafts, setProjectDrafts] = useState([]);
  const [updateDrafts, setUpdateDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/projects', { params: { status: 'Draft' } }).then((res) => res.data).catch(() => []),
      api.get('/updates/drafts').then((res) => res.data).catch(() => []),
    ])
      .then(([projects, updates]) => {
        setProjectDrafts(projects);
        // A project that is itself still a draft already shows up above - don't list it twice.
        setUpdateDrafts(updates.filter((u) => u.project?.status !== 'Draft' && u.project));
      })
      .finally(() => setLoading(false));
  }, []);

  const hasDrafts = Boolean(projectDrafts.length || updateDrafts.length);

  return (
    <div>
      <PageHeader title="Drafts" subtitle="Every unfinished PSR and update saved as a draft, in one place." />

      {loading ? (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <Spinner label="Loading drafts..." />
        </div>
      ) : !hasDrafts ? (
        <EmptyState title="No drafts" message="Anything saved as a draft from Create PSR or Update PSR will show up here." />
      ) : (
        <>
          {projectDrafts.length > 0 && (
            <div className="pcp-card" style={{ padding: 24, marginBottom: 20 }}>
              <div className="pcp-section-title">Project Information Drafts</div>
              <div className="pcp-table-wrapper">
                <table className="pcp-table">
                  <thead>
                    <tr>
                      <th>PR-ID</th>
                      <th>Account Name</th>
                      <th>Project Manager</th>
                      <th>Last Saved</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectDrafts.map((p) => (
                      <tr key={p._id}>
                        <td className="pcp-link-id">{p.prId}</td>
                        <td>{p.accountName}</td>
                        <td>{p.projectManager}</td>
                        <td>{formatDateTime(p.lastUpdatedDate || p.updatedAt)}</td>
                        <td>
                          <Button size="small" appearance="primary" onClick={() => navigate(`/update-psr/${p._id}`)}>
                            Continue
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {updateDrafts.length > 0 && (
            <div className="pcp-card" style={{ padding: 24 }}>
              <div className="pcp-section-title">Latest Update Drafts</div>
              <div className="pcp-table-wrapper">
                <table className="pcp-table">
                  <thead>
                    <tr>
                      <th>PR-ID</th>
                      <th>Account Name</th>
                      <th>Last Saved</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {updateDrafts.map((u) => (
                      <tr key={u._id}>
                        <td className="pcp-link-id">{u.project?.prId}</td>
                        <td>{u.project?.accountName}</td>
                        <td>{formatDateTime(u.updatedAt)}</td>
                        <td>
                          <Button size="small" appearance="primary" onClick={() => navigate(`/update-psr/${u.project?._id}`)}>
                            Continue
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
