import { Field, Textarea } from '@fluentui/react-components';
import AttachmentsSection from '../../Projects/ProjectDetails/AttachmentsSection.jsx';

export default function StepLatestUpdate({ form, onChange, project, mode, hasAnyUpdate }) {
  const required = mode === 'create' || !hasAnyUpdate;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section className="pcp-card" style={{ padding: 24 }}>
        <div className="pcp-section-title">Latest Update / MoM</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Current Update" required={required}>
            <Textarea rows={4} value={form.currentUpdate} onChange={(e, d) => onChange('currentUpdate', d.value)} />
          </Field>
          <Field label="Next Steps" required={required}>
            <Textarea rows={3} value={form.nextSteps} onChange={(e, d) => onChange('nextSteps', d.value)} />
          </Field>
        </div>
      </section>

      {project && <AttachmentsSection project={project} />}
    </div>
  );
}
