import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="input-field"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        autoFocus={autoFocus}
        style={{ paddingRight: 46 }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? 'Esconder senha' : 'Mostrar senha'}
        style={{
          position: 'absolute',
          right: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'var(--text-faint)',
          display: 'flex',
        }}
      >
        {visible ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
      </button>
    </div>
  );
}
