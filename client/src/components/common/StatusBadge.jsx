import { stageColors, ragColors, impactColors } from '../../theme/theme.js';

const PALETTES = { stage: stageColors, rag: ragColors, impact: impactColors };

export default function StatusBadge({ value, type = 'stage', size = 'medium', label }) {
  const palette = PALETTES[type] || stageColors;
  const colors = palette[value] || { fg: '#5B6472', bg: '#EEF0F3', border: '#C7CCD3' };
  const fontSize = size === 'large' ? 13 : 12;
  const padding = size === 'large' ? '5px 14px' : '3px 10px';

  return (
    <span
      className="pcp-status-badge"
      style={{
        color: colors.fg,
        background: colors.bg,
        borderColor: colors.border,
        fontSize,
        padding,
      }}
    >
      <span className="pcp-status-dot" style={{ background: colors.fg }} />
      {label || value || '-'}
    </span>
  );
}
