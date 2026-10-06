import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const REDOC_SCRIPT = 'https://cdn.jsdelivr.net/npm/redoc@2.5.0/bundles/redoc.standalone.js';

declare global {
  interface Window {
    Redoc?: { init: (specUrl: string, options: object, element: HTMLElement, callback?: (err?: unknown) => void) => void };
  }
}

function loadRedoc(): Promise<void> {
  if (window.Redoc) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = REDOC_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load the documentation viewer'));
    document.body.appendChild(script);
  });
}

/**
 * Public Partner API reference. Renders backend/openapi/partner-v1.yaml (served
 * by the API itself, so the docs always match the deployed version) with Redoc.
 * The spec's description holds the guides: quickstart, webhooks, delivery codes.
 */
export default function DevelopersPage() {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const specUrl = `${API_BASE_URL}/partner/v1/openapi.yaml`;

  useEffect(() => {
    let cancelled = false;
    loadRedoc()
      .then(() => {
        if (cancelled || !container.current || !window.Redoc) return;
        window.Redoc.init(specUrl, {
          hideDownloadButton: false,
          expandResponses: '200,201',
          theme: { colors: { primary: { main: '#078c35' } }, typography: { fontFamily: 'inherit', headings: { fontFamily: 'inherit' } } },
          scrollYOffset: 72,
        }, container.current, err => { if (err && !cancelled) setError('The API reference is unavailable right now. The API may be outside operating hours (05:00–20:00 GMT).'); });
      })
      .catch(err => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, [specUrl]);

  return (
    <div className="page-shell light-shell">
      <div style={{ padding: '28px 24px 0', maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ margin: 0 }}>CPS Partner API</h1>
        <p style={{ color: '#64748b', margin: '6px 0 0' }}>
          Create deliveries from your platform, get binding prices, and receive live status updates by webhook.{' '}
          {user?.role === 'business'
            ? <Link to="/business/keys">Manage your API keys</Link>
            : <><Link to="/signup">Create a business account</Link> to get API keys.</>}
          {' '}· <a href={specUrl} target="_blank" rel="noreferrer">OpenAPI spec (YAML)</a>
        </p>
        {error && <div style={{ marginTop: 16, padding: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>{error}</div>}
      </div>
      <div ref={container} />
    </div>
  );
}
