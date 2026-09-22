import { useEffect, useState } from 'react';
import { Button } from '@fluentui/react-components';
import { Delete20Regular } from '@fluentui/react-icons';
import api from '../../api/client.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import ConfirmDeleteDialog from '../../components/common/ConfirmDeleteDialog.jsx';
import { formatDateTime } from '../../utils/format.js';

export default function UpdateHistorySection({ project, refreshTrigger, onChanged }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function load() {
    setLoading(true);
    api
      .get(`/projects/${project._id}/updates`)
      .then((res) => setUpdates(res.data))
      .catch(() => setUpdates([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, [project._id, refreshTrigger]);

  async function handleDelete(reason) {
    await api.delete(`/updates/${deleteTarget._id}`, { data: { reason, deletedBy: project.projectManager } });
    load();
    onChanged?.();
  }

  return (
    <section className="pcp-card" style={{ padding: 24, marginBottom: 20 }}>
      <div className="pcp-section-title">Update History</div>

      <div className="pcp-table-wrapper">
        {updates.length ? (
          <table className="pcp-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Status</th>
                <th>Update Summary</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {updates.map((u) => (
                <tr key={u._id}>
                  <td>{formatDateTime(u.createdAt)}</td>
                  <td>{u.isDraft ? 'Draft' : 'Published'}</td>
                  <td>{(u.currentUpdate || '').slice(0, 140) || '-'}</td>
                  <td>
                    <Button size="small" icon={<Delete20Regular />} onClick={() => setDeleteTarget(u)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !loading && <EmptyState title="No updates available" message="Updates saved from the Latest Update / MoM section will appear here." />
        )}
      </div>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Update"
        itemLabel={deleteTarget ? formatDateTime(deleteTarget.createdAt) : ''}
        onConfirm={handleDelete}
      />
    </section>
  );
}
