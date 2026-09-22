import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Field, Input, Button } from '@fluentui/react-components';
import { Mail24Regular, LockClosed24Regular, Eye24Regular, EyeOff24Regular } from '@fluentui/react-icons';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import { login, getCurrentUser } from '../../auth/localAuth.js';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Only redirect away once, on mount (e.g. the user typed /login while already signed in) -
  // checking this on every render would also fire right after this page's own successful
  // login navigate() call, clobbering it with a hardcoded redirect to "/" instead.
  useEffect(() => {
    if (getCurrentUser()) {
      navigate('/', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to manage your PSR communications."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" style={{ color: 'var(--pcp-brand)', fontWeight: 600 }}>
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e, d) => setEmail(d.value)}
            placeholder="name@example.com"
            contentBefore={<Mail24Regular style={{ color: 'var(--pcp-text-secondary)' }} />}
            disabled={submitting}
          />
        </Field>
        <Field label="Password">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e, d) => setPassword(d.value)}
            placeholder="Enter your password"
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
        {error && <div style={{ color: '#C4314B', fontSize: 13 }}>{error}</div>}
        <Button type="submit" appearance="primary" disabled={submitting} style={{ marginTop: 4 }}>
          {submitting ? 'Logging in...' : 'Log In'}
        </Button>
      </form>
    </AuthLayout>
  );
}
