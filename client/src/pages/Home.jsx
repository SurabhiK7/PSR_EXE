import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderAdd24Regular,
  Edit24Regular,
  DocumentSearch24Regular,
  Delete24Regular,
  ArrowRight24Regular,
} from '@fluentui/react-icons';
import api from '../api/client.js';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { formatDateTime } from '../utils/format.js';

const ACTIONS = [
  {
    key: 'create',
    title: 'Create',
    description: 'Create a new PSR and set up all required details.',
    icon: FolderAdd24Regular,
    to: '/create-psr',
    cta: 'Create',
  },
  {
    key: 'update',
    title: 'Update',
    description: 'Update PSR information and progress.',
    icon: Edit24Regular,
    to: '/update-psr',
    cta: 'Update',
  },
  {
    key: 'read',
    title: 'Read',
    description: 'View PSR details and status.',
    icon: DocumentSearch24Regular,
    to: '/projects',
    cta: 'View',
  },
  {
    key: 'delete',
    title: 'Delete',
    description: 'Remove PSR that are no longer needed.',
    icon: Delete24Regular,
    to: '/delete-psr',
    cta: 'Delete',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/reports/recent-activity', { params: { limit: 8 } })
      .then((res) => setActivity(res.data))
      .catch(() => setActivity([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Project Status Reporting & Communication - centralized PSR management for Project Managers."
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
          marginBottom: 32,
        }}
      >
        {ACTIONS.map(({ key, title, description, icon: Icon, to, cta }, index) => (
          <button
            key={key}
            className="pcp-option-card pcp-fade-up"
            onClick={() => navigate(to)}
            style={{ ...optionCardStyle, animationDelay: `${index * 60}ms` }}
          >
            <div className="pcp-option-icon" style={iconWrap}>
              <Icon fontSize={26} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#101828', marginTop: 14 }}>{title}</div>
            <div style={{ fontSize: 13, color: 'var(--pcp-text-secondary)', marginTop: 4, textAlign: 'center' }}>
              {description}
            </div>
            <div className="pcp-option-cta" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, color: '#0F1B2D', fontWeight: 600, fontSize: 13 }}>
              {cta} <ArrowRight24Regular fontSize={16} />
            </div>
          </button>
        ))}
      </div>

      <section className="pcp-card" style={{ padding: 24 }}>
        <div className="pcp-section-title">Recent Activity</div>
        {!loading && activity.length === 0 && (
          <EmptyState title="No recent activity to display" message="Actions taken on PSRs will show up here." />
        )}
        {activity.length > 0 && (
          <div className="pcp-timeline">
            {activity.map((item) => (
              <div key={item._id} className="pcp-timeline-item">
                <span className="pcp-timeline-dot" style={{ background: 'var(--pcp-brand)' }} />
                <div style={{ fontSize: 13.5, color: '#101828', fontWeight: 600 }}>
                  {item.action.replace(/^Project\b/, 'PSR').replace('Update Published', 'Update Submitted')}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--pcp-text-secondary)' }}>
                  {item.project ? `${item.project.prId} - ${item.project.accountName}` : 'Project removed'} · {item.user} · {formatDateTime(item.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const optionCardStyle = {
  background: '#FFFFFF',
  border: '1px solid var(--pcp-border)',
  borderRadius: 12,
  padding: '32px 24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'box-shadow 0.15s ease, transform 0.15s ease',
};

const iconWrap = {
  width: 56,
  height: 56,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#F0F3F7',
  color: '#0F1B2D',
};

