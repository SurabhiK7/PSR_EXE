import { Dropdown, Option, Input } from '@fluentui/react-components';
import { COUNTRY_CODES, splitPhoneValue, combinePhoneValue } from '../../utils/validation.js';

// Combined country-code dropdown + number input. Stores/emits a single string
// ("+91 9876543210") so it's a drop-in replacement for a plain phone Input.
export default function PhoneNumberInput({ value, onChange, disabled }) {
  const { dialCode, number } = splitPhoneValue(value);

  function emit(nextDialCode, nextNumber) {
    onChange(combinePhoneValue(nextDialCode, nextNumber));
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Dropdown
        style={{ width: 132, flexShrink: 0 }}
        value={dialCode}
        selectedOptions={[dialCode]}
        onOptionSelect={(e, d) => emit(d.optionValue, number)}
        disabled={disabled}
      >
        {COUNTRY_CODES.map((c) => (
          <Option key={c.iso} value={c.dialCode} text={`${c.dialCode} ${c.name}`}>
            {c.dialCode} {c.name}
          </Option>
        ))}
      </Dropdown>
      <Input
        style={{ flex: 1 }}
        value={number}
        onChange={(e, d) => emit(dialCode, d.value)}
        disabled={disabled}
        placeholder="Phone number"
      />
    </div>
  );
}
