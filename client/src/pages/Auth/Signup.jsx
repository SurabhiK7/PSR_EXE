import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Field, Input, Button } from '@fluentui/react-components';
import { Person24Regular, Mail24Regular, LockClosed24Regular, Eye24Regular, EyeOff24Regular } from '@fluentui/react-icons';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import { signup, getCurrentUser } from '../../auth/localAuth.js';

const emptyForm = { name: '', email: '', password: '', confirmPassword: '' };

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Only redirect away once, on mount - see the matching comment in Login.jsx for why this
  // can't be a plain render-time check.
  useEffect(() => {
    if (getCurrentUser()) {
      navigate('/', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await signup(form.name.trim(), form.email.trim(), form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create your account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up a password now - you'll use it to log in from now on."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--pcp-brand)', fontWeight: 600 }}>
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Full Name">
          <Input
            value={form.name}
            onChange={(e, d) => update('name', d.value)}
            placeholder="Your name"
            contentBefore={<Person24Regular style={{ color: 'var(--pcp-text-secondary)' }} />}
            disabled={submitting}
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e, d) => update('email', d.value)}
            placeholder="name@example.com"
            contentBefore={<Mail24Regular style={{ color: 'var(--pcp-text-secondary)' }} />}
            disabled={submitting}
          />
        </Field>
        <Field label="Password" hint="At least 8 characters">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e, d) => update('password', d.value)}
            placeholder="Create a password"
            contentBefore={<LockClosed24Regular style={{ color: 'var(--pcp-text-secondary)' }} />}
            contentAfter={
              <Button
                appearance="transparent"
                size="small"
                icon={showPassword ? <EyeOff24Regular /> : <Eye24Regular />}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              />
            }
            disabled={submitting}
          />
        </Field>
        <Field label="Confirm Password">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={form.confirmPassword}
            onChange={(e, d) => update('confirmPassword', d.value)}
            placeholder="Re-enter your password"
            contentBefore={<LockClosed24Regular style={{ color: 'var(--pcp-text-secondary)' }} />}
            disabled={submitting}
          />
        </Field>
        {error && <div style={{ color: '#C4314B', fontSize: 13 }}>{error}</div>}
        <Button type="submit" appearance="primary" disabled={submitting} style={{ marginTop: 4 }}>
          {submitting ? 'Creating account...' : 'Sign Up'}
        </Button>
      </form>
    </AuthLayout>
  );
}
