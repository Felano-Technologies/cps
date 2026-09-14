import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  CheckCircle2,
  Share,
  PlusSquare,
  X,
  LogIn,
  ArrowRight,
  PackagePlus,
  Search,
  Truck,
  Clock,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth, getRoleDashboard } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import appIcon from '../assets/logo2.png';

import '../styles/landing.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallHeroProps {
  trackingQuery?: string;
  setTrackingQuery?: (val: string) => void;
  onTrackSubmit?: (e: React.FormEvent) => void;
}

export default function InstallAppBanner({
  trackingQuery = '',
  setTrackingQuery,
  onTrackSubmit,
}: InstallHeroProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowGuideModal(false);
      toast.success('CPS App installed successfully! You can now launch it from your home screen.');
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowGuideModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          toast.success('Adding CPS App to your device...');
        }
        setDeferredPrompt(null);
      } catch {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const dashboardPath = isAuthenticated && user ? getRoleDashboard(user.role) : '/signin';

  return (
    <>
      {/* ──────────────── DESKTOP HERO ──────────────── */}
      <section className="lp-hero-section hero-install-desktop-only">
        {/* Background decorative glow blobs */}
        <div className="lp-hero-glow lp-hero-glow-1" aria-hidden="true" />
        <div className="lp-hero-glow lp-hero-glow-2" aria-hidden="true" />

        <div className="container lp-hero-inner">
          <div className="lp-hero-left">

            {/* Main Heading */}
            <h1 className="lp-hero-heading">
              Beyond Words,<br />
              <span className="lp-hero-heading-accent">We Deliver</span>
            </h1>

            {/* Subheading */}
            <p className="lp-hero-sub">
              Same-day pickup, real-time tracking, and proof of delivery — for individuals, businesses, and enterprise teams.
            </p>

            {/* Primary CTA row */}
            <div className="lp-hero-cta-row">
              <Link
                to={isAuthenticated ? dashboardPath : '/request-pickup'}
                className="lp-cta-primary"
                id="desktop-hero-pickup-btn"
              >
                <PackagePlus size={18} />
                <span>{isAuthenticated ? 'Open Dashboard' : 'Request a Pickup'}</span>
                <ArrowRight size={16} className="lp-cta-arrow" />
              </Link>

              {!isAuthenticated && (
                <Link to="/signin" className="lp-cta-secondary" id="desktop-hero-signin-btn">
                  <LogIn size={16} />
                  <span>Sign In</span>
                </Link>
              )}

              {/* Small Install App ghost button */}
              {!isInstalled ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="lp-install-ghost-btn"
                  id="desktop-install-cps-btn"
                  title="Install CPS as a desktop or home-screen app"
                >
                  <Download size={14} />
                  <span>Install App</span>
                </button>
              ) : (
                <span className="lp-installed-micro-badge">
                  <CheckCircle2 size={14} color="#22c55e" />
                  <span>App Installed</span>
                </span>
              )}
            </div>

            {/* Tracking form */}
            {onTrackSubmit && (
              <form onSubmit={onTrackSubmit} className="lp-track-form">
                <div className="lp-track-field">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Track a parcel — enter tracking ID..."
                    value={trackingQuery}
                    onChange={(e) => setTrackingQuery && setTrackingQuery(e.target.value)}
                    id="desktop-track-input"
                  />
                </div>
                <button type="submit" className="lp-track-btn">
                  Track
                  <ArrowRight size={15} />
                </button>
              </form>
            )}

            {/* Trust signals */}
            <div className="lp-trust-row">
              <div className="lp-trust-item">
                <Truck size={14} />
                <span>Motorbike &amp; Van Fleet</span>
              </div>
              <div className="lp-trust-item">
                <Clock size={14} />
                <span>Same-Day Pickup</span>
              </div>
              <div className="lp-trust-item">
                <ShieldCheck size={14} />
                <span>Proof of Delivery</span>
              </div>
              <div className="lp-trust-item">
                <Zap size={14} />
                <span>Express Available</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── MOBILE VIEW ──────────────── */}
      <section className="lp-hero-section hero-install-mobile-only-section">
        {/* Ambient glows */}
        <div className="lp-hero-glow lp-hero-glow-1" aria-hidden="true" />
        <div className="lp-hero-glow lp-hero-glow-2" aria-hidden="true" />

        <div className="lp-hero-inner lp-hero-inner-mobile">
          <div className="lp-hero-left lp-hero-left-mobile">

            {/* Heading */}
            <h1 className="lp-hero-heading lp-hero-heading-mobile">
              Beyond Words,<br />
              <span className="lp-hero-heading-accent">We Deliver</span>
            </h1>

            {/* Lede */}
            <p className="lp-hero-sub lp-hero-sub-mobile">
              Same-day pickup, real-time tracking, and proof of delivery — for individuals, businesses, and enterprise teams.
            </p>

            {/* Primary + secondary CTAs */}
            <div className="lp-hero-cta-row lp-hero-cta-row-mobile">
              <Link
                to={isAuthenticated ? dashboardPath : '/request-pickup'}
                className="lp-cta-primary lp-cta-primary-mobile"
                id="mobile-hero-pickup-btn"
              >
                <PackagePlus size={18} />
                <span>{isAuthenticated ? 'Open Dashboard' : 'Request a Pickup'}</span>
                <ArrowRight size={16} className="lp-cta-arrow" />
              </Link>

              {!isAuthenticated && (
                <Link to="/signin" className="lp-cta-secondary lp-cta-secondary-mobile" id="mobile-hero-signin-btn">
                  <LogIn size={16} />
                  <span>Sign In</span>
                </Link>
              )}
            </div>

            {/* Install / installed pill */}
            {!isInstalled ? (
              <button
                type="button"
                onClick={handleInstallClick}
                className="lp-install-ghost-btn lp-install-ghost-btn-mobile"
                id="mobile-install-cps-btn"
                title="Install CPS as a home-screen app"
              >
                <Download size={14} />
                <span>{isIOS ? 'Add to Home Screen' : 'Install CPS App'}</span>
              </button>
            ) : (
              <span className="lp-installed-micro-badge">
                <CheckCircle2 size={14} color="#22c55e" />
                <span>App Installed</span>
              </span>
            )}

            {/* Tracking form */}
            {onTrackSubmit && (
              <form onSubmit={onTrackSubmit} className="lp-track-form lp-track-form-mobile">
                <div className="lp-track-field">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Track a parcel — enter tracking ID..."
                    value={trackingQuery}
                    onChange={(e) => setTrackingQuery && setTrackingQuery(e.target.value)}
                    id="mobile-track-input"
                  />
                </div>
                <button type="submit" className="lp-track-btn">
                  Track
                  <ArrowRight size={15} />
                </button>
              </form>
            )}

            {/* Trust pills */}
            <div className="lp-trust-row">
              <div className="lp-trust-item"><Truck size={14} /><span>Motorbike &amp; Van Fleet</span></div>
              <div className="lp-trust-item"><Clock size={14} /><span>Same-Day Pickup</span></div>
              <div className="lp-trust-item"><ShieldCheck size={14} /><span>Proof of Delivery</span></div>
              <div className="lp-trust-item"><Zap size={14} /><span>Express Available</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── INSTALL GUIDE MODAL ──────────────── */}
      {showGuideModal && (
        <div className="install-modal-overlay" onClick={() => setShowGuideModal(false)}>
          <div
            className={`install-modal-card ${isIOS ? 'ios-safari-modal' : ''}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Install App Guide"
          >
            <button
              type="button"
              className="install-modal-close"
              onClick={() => setShowGuideModal(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="install-modal-header-compact">
              <img src={appIcon} alt="CPS Logo" className="modal-logo-mini" />
              <div>
                <h3 className="modal-title-compact">Add CPS to Home Screen</h3>
                <p className="modal-subtitle-compact">Install for instant 1-tap courier access</p>
              </div>
            </div>

            <div className="install-steps-list-compact">
              {isIOS ? (
                <>
                  <div className="install-step-compact">
                    <div className="step-badge-mini">1</div>
                    <div className="step-info-mini">
                      Tap the <strong>Share</strong> icon (<Share size={14} className="inline-step-icon" />) in your Safari toolbar below.
                    </div>
                  </div>
                  <div className="install-step-compact">
                    <div className="step-badge-mini">2</div>
                    <div className="step-info-mini">
                      Scroll down and select <PlusSquare size={14} className="inline-step-icon" /> <strong>Add to Home Screen</strong>.
                    </div>
                  </div>
                  <div className="install-step-compact">
                    <div className="step-badge-mini">3</div>
                    <div className="step-info-mini">Tap <strong>Add</strong> in the top-right corner.</div>
                  </div>
                </>
              ) : isAndroid ? (
                <>
                  <div className="install-step-compact">
                    <div className="step-badge-mini">1</div>
                    <div className="step-info-mini">Tap the <strong>menu icon</strong> (⋮) in Chrome at top-right.</div>
                  </div>
                  <div className="install-step-compact">
                    <div className="step-badge-mini">2</div>
                    <div className="step-info-mini">Tap <strong>Install App</strong> or <strong>Add to Home screen</strong>.</div>
                  </div>
                  <div className="install-step-compact">
                    <div className="step-badge-mini">3</div>
                    <div className="step-info-mini">Confirm installation to add CPS to your home screen.</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="install-step-compact">
                    <div className="step-badge-mini">1</div>
                    <div className="step-info-mini">
                      Look for the <strong>Install</strong> icon (<Download size={13} className="inline-step-icon" />) in your address bar.
                    </div>
                  </div>
                  <div className="install-step-compact">
                    <div className="step-badge-mini">2</div>
                    <div className="step-info-mini">
                      Or press <kbd>Ctrl+D</kbd> (<kbd>⌘+D</kbd> on Mac) to bookmark this page.
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="install-modal-footer-compact">
              <button
                type="button"
                className="modal-gotit-btn-compact primary-green"
                onClick={() => setShowGuideModal(false)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
