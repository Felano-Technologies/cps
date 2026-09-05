import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  CheckCircle2,
  Share,
  PlusSquare,
  Sparkles,
  Zap,
  ShieldCheck,
  X,
  LogIn,
  Layers,
  ArrowRight,
  PackagePlus,
  Search,
  Truck,
  Clock,
  MapPinned,
  PackageCheck,
  LayoutDashboard
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
    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);

    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);

    // Listen for PWA beforeinstallprompt event
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
      if (e.key === 'Escape') {
        setShowGuideModal(false);
      }
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
      } catch (err) {
        console.error('Install prompt error:', err);
        setShowGuideModal(true);
      }
    } else {
      // Show manual guide modal (iOS Safari, non-Chrome browsers, desktop)
      setShowGuideModal(true);
    }
  };

  const dashboardPath = isAuthenticated && user ? getRoleDashboard(user.role) : '/signin';

  return (
    <>
      <main className="hero-install-main container">
        {/* MOBILE VIEW: Welcome to CPS text above the install button and quick actions */}
        <div className="hero-install-mobile-only">
          <div className="mobile-hero-welcome-wrap">
            <div className="hero-eyebrow" style={{ display: 'inline-flex', alignSelf: 'flex-start' }}>
              <Sparkles size={16} /> Fast, Reliable Courier Service
            </div>
            <h1 className="mobile-welcome-heading">
              Welcome to <span className="text-brand-green">CPS</span> Delivery Services
            </h1>
            <p className="mobile-welcome-lede">
              Seamless parcel delivery, express courier runs, and instant live tracking across Ghana.
            </p>
          </div>

          {/* Prominent Mobile Install Button */}
          {!isInstalled ? (
            <button
              type="button"
              onClick={handleInstallClick}
              className="mobile-install-cta-btn"
              id="mobile-install-cps-btn"
            >
              <Download size={20} className="pulse-icon" />
              <div className="btn-label-group">
                <span className="btn-main-label">{isIOS ? 'Add to Home Screen' : 'Install CPS App'}</span>
                <span className="btn-sub-label">1-Tap Fast Access &amp; Easy Login</span>
              </div>
              <ArrowRight size={18} />
            </button>
          ) : (
            <div className="mobile-installed-card">
              <div className="mobile-installed-left">
                <div className="installed-icon-circle">
                  <CheckCircle2 size={18} color="#16a34a" />
                </div>
                <div className="mobile-installed-texts">
                  <strong className="installed-title">CPS App Installed</strong>
                  <span className="installed-sub">Ready on your home screen</span>
                </div>
              </div>
              <Link to={dashboardPath} className="mobile-installed-signin-btn">
                {isAuthenticated ? <LayoutDashboard size={14} /> : <LogIn size={14} />}
                <span>{isAuthenticated ? 'Dashboard' : 'Sign In'}</span>
              </Link>
            </div>
          )}

          <div className="mobile-quick-actions">
            <Link to={isAuthenticated ? dashboardPath : "/request-pickup"} className="dark-btn mobile-pickup-btn">
              <PackagePlus size={18} />
              <span>{isAuthenticated ? 'My Dashboard' : 'Request Pickup'}</span>
            </Link>
          </div>

          {onTrackSubmit && (
            <form onSubmit={onTrackSubmit} className="hero-search-row">
              <div className="search-field">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Enter tracking ID or pickup code"
                  value={trackingQuery}
                  onChange={(e) => setTrackingQuery && setTrackingQuery(e.target.value)}
                />
              </div>
              <button type="submit" className="primary-green">
                <span>Track</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          <div className="trust-strip">
            <div className="trust-item">
              <Truck size={16} />
              <span>Motorbike &amp; van fleet</span>
            </div>
            <div className="trust-item">
              <Clock size={16} />
              <span>Same-day pickup</span>
            </div>
            <div className="trust-item">
              <ShieldCheck size={16} />
              <span>Proof of delivery (POD)</span>
            </div>
          </div>
        </div>

        {/* DESKTOP VIEW: Clean, full-bleed hero card with install prominence */}
        <div className="hero-install-desktop-only">
          <div className="desktop-hero-layout">
            
            {/* Left Column: Value Prop & Actions */}
            <div className="desktop-hero-left">
              <div className="hero-eyebrow">
                <Sparkles size={16} /> Fast, Reliable Courier Service
              </div>

              <h1 className="desktop-hero-heading">
                Welcome to <span className="text-brand-green">CPS</span> Delivery Services
              </h1>

              <p className="desktop-hero-lede">
                Professional motorbike and van courier network. Install the CPS Web App on your desktop or phone for instant 1-tap pickups, live GPS tracking, and effortless order management.
              </p>

              {/* Install and Action Buttons */}
              <div className="desktop-hero-actions">
                {!isInstalled ? (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="hero-install-primary-btn"
                    id="desktop-install-cps-btn"
                  >
                    <Download size={20} />
                    <span>Install App on Desktop / Mobile</span>
                  </button>
                ) : (
                  <div className="desktop-installed-pill">
                    <CheckCircle2 size={20} color="#22c55e" />
                    <span>App is Installed on this Device</span>
                  </div>
                )}

                <Link to={isAuthenticated ? dashboardPath : "/request-pickup"} className="hero-pickup-secondary-btn">
                  <PackagePlus size={19} />
                  <span>{isAuthenticated ? 'Open Dashboard' : 'Request Pickup'}</span>
                </Link>
              </div>

              {/* Tracking Row */}
              {onTrackSubmit && (
                <form onSubmit={onTrackSubmit} className="desktop-hero-search-row">
                  <div className="search-field">
                    <Search size={18} />
                    <input
                      type="text"
                      placeholder="Enter tracking ID or pickup code"
                      value={trackingQuery}
                      onChange={(e) => setTrackingQuery && setTrackingQuery(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="hero-track-submit-btn">
                    <span>Track</span>
                    <ArrowRight size={17} />
                  </button>
                </form>
              )}

              {/* Trust Badges */}
              <div className="desktop-hero-trust-row">
                <div className="trust-pill">
                  <Truck size={16} color="#078c35" />
                  <span>Motorbike &amp; van fleet</span>
                </div>
                <div className="trust-pill">
                  <Clock size={16} color="#078c35" />
                  <span>Same-day pickup</span>
                </div>
                <div className="trust-pill">
                  <ShieldCheck size={16} color="#078c35" />
                  <span>Proof of delivery (POD)</span>
                </div>
              </div>
            </div>

            {/* Right Column: Visual App Card Preview */}
            <div className="desktop-hero-right">
              <div className="pwa-preview-card">
                <div className="pwa-card-header">
                  <div className="pwa-card-icon">
                    <img src={appIcon} alt="CPS App Icon" width={48} height={48} />
                  </div>
                  <div className="pwa-card-titles">
                    <h3>CPS Delivery App</h3>
                    <span>Web &amp; Mobile Experience</span>
                  </div>
                  <div className="pwa-card-badge">PWA</div>
                </div>

                <div className="pwa-features-grid">
                  <div className="pwa-feat-item">
                    <div className="pwa-feat-icon">
                      <Zap size={18} color="#078c35" />
                    </div>
                    <div>
                      <strong>Instant Access</strong>
                      <p>Open directly from your desktop or home screen</p>
                    </div>
                  </div>

                  <div className="pwa-feat-item">
                    <div className="pwa-feat-icon">
                      <MapPinned size={18} color="#078c35" />
                    </div>
                    <div>
                      <strong>Live Tracking</strong>
                      <p>Real-time GPS updates for every package</p>
                    </div>
                  </div>

                  <div className="pwa-feat-item">
                    <div className="pwa-feat-icon">
                      <PackageCheck size={18} color="#078c35" />
                    </div>
                    <div>
                      <strong>Quick Pickups</strong>
                      <p>Request courier dispatch in under 30 seconds</p>
                    </div>
                  </div>

                  <div className="pwa-feat-item">
                    <div className="pwa-feat-icon">
                      <Layers size={18} color="#078c35" />
                    </div>
                    <div>
                      <strong>Works Everywhere</strong>
                      <p>Install on iOS, Android, macOS, and Windows</p>
                    </div>
                  </div>
                </div>

                <div className="pwa-card-footer">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="pwa-card-install-btn"
                  >
                    <Download size={17} />
                    <span>{isInstalled ? 'App Installed' : 'Get CPS Web App'}</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Compact Manual Installation / Add to Home Screen Modal */}
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
                    <div className="step-info-mini">
                      Tap <strong>Add</strong> in the top-right corner.
                    </div>
                  </div>
                </>
              ) : isAndroid ? (
                <>
                  <div className="install-step-compact">
                    <div className="step-badge-mini">1</div>
                    <div className="step-info-mini">
                      Tap the <strong>menu icon</strong> (⋮) in Chrome at top-right.
                    </div>
                  </div>
                  <div className="install-step-compact">
                    <div className="step-badge-mini">2</div>
                    <div className="step-info-mini">
                      Tap <strong>Install App</strong> or <strong>Add to Home screen</strong>.
                    </div>
                  </div>
                  <div className="install-step-compact">
                    <div className="step-badge-mini">3</div>
                    <div className="step-info-mini">
                      Confirm installation to add CPS to your home screen.
                    </div>
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
