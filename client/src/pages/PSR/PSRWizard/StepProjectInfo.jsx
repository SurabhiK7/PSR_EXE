import { Field, Input, Textarea, Dropdown, Option } from '@fluentui/react-components';
import DateInput from '../../../components/common/DateInput.jsx';

const PROJECT_STAGES = ['In Progress', 'At Risk', 'Delayed', 'On Hold', 'Completed', 'Closed'];

export default function StepProjectInfo({ form, onChange, prId, mode }) {
  return (
    <section className="pcp-card" style={{ padding: 24 }}>
      <div className="pcp-section-title">Project Information</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {mode === 'create' ? (
          <Field label="PR-ID" required>
            <Input
              value={form.prId}
              onChange={(e, d) => onChange('prId', d.value)}
            />
          </Field>
        ) : (
          <Field label="PR-ID">
            <Input value={prId || ''} disabled />
          </Field>
        )}
        <Field label="Account Name" required>
          <Input value={form.accountName} onChange={(e, d) => onChange('accountName', d.value)} />
        </Field>
        <Field label="Project Manager" required>
          <Input value={form.projectManager} onChange={(e, d) => onChange('projectManager', d.value)} />
        </Field>
        <Field label="Project Start Date" required>
          <DateInput value={form.projectStartDate} onChange={(e, d) => onChange('projectStartDate', d.value)} />
        </Field>
        <Field label="Reporting Period Start Date">
          <DateInput value={form.reportingPeriodStartDate} onChange={(e, d) => onChange('reportingPeriodStartDate', d.value)} />
        </Field>
        <Field label="Reporting Period End Date">
          <DateInput value={form.reportingPeriodEndDate} onChange={(e, d) => onChange('reportingPeriodEndDate', d.value)} />
        </Field>
        <Field label="Project Status" required>
          <Dropdown
            value={form.projectStage}
            selectedOptions={[form.projectStage]}
            onOptionSelect={(e, d) => onChange('projectStage', d.optionValue)}
          >
            {PROJECT_STAGES.map((s) => (
              <Option key={s} value={s}>{s}</Option>
            ))}
          </Dropdown>
        </Field>
      </div>
      <div style={{ marginTop: 16 }}>
        <Field label="Project Scope" required>
          <Textarea value={form.projectScope} onChange={(e, d) => onChange('projectScope', d.value)} rows={5} style={{ width: '100%' }} />
        </Field>
      </div>
    </section>
  );
}
