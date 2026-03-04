import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, Heart } from 'lucide-react';
import { adminApi, ApiError } from '@/lib/api';

export function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) return;

    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.verifyPin(pin);
      localStorage.setItem('admin_token', result.token);
      localStorage.setItem('admin_name', result.admin.name);
      navigate('/admin');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code === 'RATE_LIMITED' ? err.message : 'Invalid PIN');
      } else {
        setError('Connection failed');
      }
    } finally {
      setLoading(false);
    }
  }, [pin, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-6 text-center">
        <div className="space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Heart className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Family Memory Admin</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="mx-auto w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>

          <div>
            <label htmlFor="pin" className="text-sm font-medium text-foreground">
              Enter PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="- - - -"
              className="mt-2 w-full text-center text-2xl tracking-[0.5em] font-mono border border-input rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={pin.length !== 4 || loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
