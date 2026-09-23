import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input, Dropdown, Option, Button, Spinner } from '@fluentui/react-components';
import { Search24Regular, FilterDismiss24Regular } from '@fluentui/react-icons';
import api from '../../api/client.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { formatDate } from '../../utils/format.js';

const PROJECT_STAGES = ['In Progress', 'At Risk', 'Delayed', 'On Hold', 'Completed', 'Closed'];

export default function ExistingProjects() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [projectStage, setProjectStage] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (query) params.q = query;
    if (projectStage) params.projectStage = projectStage;
    api
      .get('/projects', { params })
      .then((res) => setProjects(res.data))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [query, projectStage]);

  function clearFilters() {
    setQuery('');
    setProjectStage('');
  }

  const hasActiveFilters = Boolean(query || projectStage);

  return (
    <div>
      <PageHeader title="My PSR" subtitle="Search and manage PSRs on file." />

      <div className="pcp-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Input
            contentBefore={<Search24Regular />}
            placeholder="Search by PR-ID, Account Name, or Project Manager"
            value={query}
            onChange={(e, d) => setQuery(d.value)}
            style={{ flex: 1 }}
            size="large"
          />
          <Dropdown
            placeholder="Project Status"
            value={projectStage}
            selectedOptions={projectStage ? [projectStage] : []}
            onOptionSelect={(e, d) => setProjectStage(d.optionValue)}
            style={{ minWidth: 200 }}
          >
            {PROJECT_STAGES.map((s) => <Option key={s} value={s}>{s}</Option>)}
          </Dropdown>
          {hasActiveFilters && (
            <Button icon={<FilterDismiss24Regular />} onClick={clearFilters}>Clear</Button>
          )}
        </div>
      </div>

      <div className="pcp-table-wrapper">
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <Spinner label="Loading projects..." />
          </div>
        ) : projects.length ? (
          <table className="pcp-table">
            <thead>
              <tr>
                <th>PR-ID</th>
                <th>Account Name</th>
                <th>Project Manager</th>
                <th>Project Status</th>
                <th>Status</th>
                <th>Last Updated Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p._id}>
                  <td className="pcp-link-id">{p.prId}</td>
                  <td>{p.accountName}</td>
                  <td>{p.projectManager}</td>
                  <td><StatusBadge value={p.projectStage} type="stage" /></td>
                  <td>{p.status || 'Draft'}</td>
                  <td>{formatDate(p.lastUpdatedDate)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="small" appearance="outline" onClick={() => navigate(`/projects/${p._id}`)}>
                        View
                      </Button>
                      <Button size="small" onClick={() => navigate(`/update-psr/${p._id}`)}>
                        Update
                      </Button>
                      <Button size="small" onClick={() => navigate(`/delete-psr?id=${p._id}`)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="No projects available" message="Create a new project to get started." />
        )}
      </div>
    </div>
  );
}
