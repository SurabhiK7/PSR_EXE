import { DocumentSearch24Regular } from '@fluentui/react-icons';

export default function EmptyState({ title = 'No results found', message = 'Try adjusting your search or filters.', icon: Icon = DocumentSearch24Regular }) {
  return (
    <div className="pcp-empty-state">
      <div className="pcp-empty-state-icon">
        <Icon style={{ fontSize: 26 }} />
      </div>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F1B2D' }}>{title}</div>
      <div style={{ fontSize: 13 }}>{message}</div>
    </div>
  );
}
