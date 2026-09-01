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
  PackageCheck
} from 'lucide-react';
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

  return (
    <>
      <main className="hero-install-main container">
        {/* MOBILE VIEW: Compact top area with ONLY the install button and key quick actions */}
        <div className="hero-install-mobile-only">
          <div className="mobile-app-header-row">
            <div className="mobile-app-brand">
              <img src={appIcon} alt="CPS Logo" className="mobile-app-logo" />
              <div>
                <h2 className="mobile-app-title">CPS Delivery</h2>
                <span className="mobile-app-sub">Express &amp; Same-Day Courier</span>
              </div>
            </div>
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
            <div className="mobile-installed-badge">
              <CheckCircle2 size={18} color="#22c55e" />
              <span>App Installed on Home Screen</span>
              <Link to="/signin" className="mobile-signin-btn">
                <LogIn size={15} /> Sign In
              </Link>
            </div>
          )}

          <div className="mobile-quick-actions">
            <Link to="/request-pickup" className="dark-btn mobile-pickup-btn">
              <PackagePlus size={18} />
              <span>Request Pickup</span>
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
              <button type="submit" className="primary-green track-btn" style={{ border: 'none', cursor: 'pointer' }}>
                Track <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>

        {/* DESKTOP VIEW: Full Hero Section Replaced by Install Showcase & Brand Actions */}
        <div className="hero-install-desktop-only">
          <div className="desktop-hero-grid">

            {/* Left Hero Column */}
            <div className="desktop-hero-left">
              <div className="desktop-hero-eyebrow">
                <Sparkles size={14} />
                <span>Express &amp; Same-Day Courier App</span>
              </div>

              <h1 className="desktop-hero-title">
                Welcome to <br />
                <span className="text-brand-green">CPS</span> Delivery Services
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

                <Link to="/request-pickup" className="hero-pickup-secondary-btn">
                  <PackagePlus size={19} />
                  <span>Request Pickup</span>
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
                  <button type="submit" className="primary-green track-btn" style={{ border: 'none', cursor: 'pointer' }}>
                    Track <ArrowRight size={16} />
                  </button>
                </form>
              )}

              {/* Badges List */}
              <ul className="desktop-hero-features">
                <li><Truck size={16} /> Motorbike &amp; van fleet</li>
                <li><Clock size={16} /> Same-day pickup</li>
                <li><ShieldCheck size={16} /> Proof of delivery (POD)</li>
              </ul>
            </div>

            {/* Right Hero Column: Install App Showcase Card */}
            <div className="desktop-hero-right">
              <div className="hero-app-card">
                <div className="hero-app-card-glow" />

                <div className="hero-app-card-header">
                  <div className="hero-app-icon-box">
                    <img src={appIcon} alt="CPS Delivery Icon" className="hero-app-icon" />
                    <span className="hero-app-icon-status" />
                  </div>
                  <div>
                    <div className="hero-app-pill">Web App &amp; PWA</div>
                    <h3 className="hero-app-name">CPS Courier Portal</h3>
                    <p className="hero-app-desc">Instant 1-Tap Homescreen Access</p>
                  </div>
                </div>

                <div className="hero-app-benefits">
                  <div className="hero-benefit-row">
                    <div className="hero-benefit-icon"><Zap size={16} /></div>
                    <div>
                      <strong>1-Click Instant Dispatch</strong>
                      <span>Request motorbike or van courier in seconds</span>
                    </div>
                  </div>

                  <div className="hero-benefit-row">
                    <div className="hero-benefit-icon"><MapPinned size={16} /></div>
                    <div>
                      <strong>Live GPS Tracking</strong>
                      <span>Real-time rider location &amp; recipient status</span>
                    </div>
                  </div>

                  <div className="hero-benefit-row">
                    <div className="hero-benefit-icon"><Layers size={16} /></div>
                    <div>
                      <strong>Always Logged In</strong>
                      <span>Instant dashboard access without URL retyping</span>
                    </div>
                  </div>
                </div>

                <div className="hero-app-card-footer">
                  <div className="hero-verified-chip">
                    <PackageCheck size={16} />
                    <span>100% Secure &amp; Verified</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="hero-card-install-btn"
                  >
                    <Download size={15} /> Install Shortcut
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Manual Installation / Add to Home Screen Instructions Modal */}
      {showGuideModal && (
        <div className="install-modal-overlay" onClick={() => setShowGuideModal(false)}>
          <div className="install-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Install App Guide">
            <button
              type="button"
              className="install-modal-close"
              onClick={() => setShowGuideModal(false)}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="install-modal-header">
              <div className="install-modal-icon">
                <img src={appIcon} alt="CPS Logo" width={44} height={44} style={{ borderRadius: '10px' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                  Add CPS to Home Screen
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                  Follow these simple steps to bookmark the app icon on your phone or desktop:
                </p>
              </div>
            </div>

            <div className="install-steps-list">
              {isIOS ? (
                <>
                  <div className="install-step-item">
                    <div className="step-number">1</div>
                    <div className="step-text">
                      <strong>Tap the Share button</strong>
                      <span>Look for the share icon (<Share size={15} style={{ verticalAlign: 'middle', display: 'inline' }} />) in your Safari toolbar at the bottom or top of your screen.</span>
                    </div>
                  </div>
                  <div className="install-step-item">
                    <div className="step-number">2</div>
                    <div className="step-text">
                      <strong>Select &ldquo;Add to Home Screen&rdquo;</strong>
                      <span>Scroll down the share menu options and tap <PlusSquare size={15} style={{ verticalAlign: 'middle', display: 'inline' }} /> <strong>Add to Home Screen</strong>.</span>
                    </div>
                  </div>
                  <div className="install-step-item">
                    <div className="step-number">3</div>
                    <div className="step-text">
                      <strong>Tap &ldquo;Add&rdquo;</strong>
                      <span>Tap <strong>Add</strong> in the top-right corner. CPS Delivery will now appear on your home screen for quick 1-tap login!</span>
                    </div>
                  </div>
                </>
              ) : isAndroid ? (
                <>
                  <div className="install-step-item">
                    <div className="step-number">1</div>
                    <div className="step-text">
                      <strong>Open Chrome Menu</strong>
                      <span>Tap the <strong>three dots</strong> (⋮) icon in the top-right corner of your browser.</span>
                    </div>
                  </div>
                  <div className="install-step-item">
                    <div className="step-number">2</div>
                    <div className="step-text">
                      <strong>Select &ldquo;Install App&rdquo; or &ldquo;Add to Home screen&rdquo;</strong>
                      <span>Tap <strong>Install App</strong> (or <strong>Add to Home screen</strong>) from the menu list.</span>
                    </div>
                  </div>
                  <div className="install-step-item">
                    <div className="step-number">3</div>
                    <div className="step-text">
                      <strong>Confirm Installation</strong>
                      <span>Tap <strong>Install</strong> to confirm. The CPS App shortcut will be placed right on your home screen!</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="install-step-item">
                    <div className="step-number">1</div>
                    <div className="step-text">
                      <strong>Install from Browser Address Bar</strong>
                      <span>Look for the <strong>Install</strong> icon (<Download size={14} style={{ verticalAlign: 'middle', display: 'inline' }} /> or ⊕) in your browser address bar on the right.</span>
                    </div>
                  </div>
                  <div className="install-step-item">
                    <div className="step-number">2</div>
                    <div className="step-text">
                      <strong>Or Bookmark for Quick Access</strong>
                      <span>Press <kbd style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>Ctrl</kbd> + <kbd style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>D</kbd> (or <kbd style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>⌘</kbd> + <kbd style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>D</kbd> on Mac) to bookmark this page to your bookmarks bar.</span>
                    </div>
                  </div>
                  <div className="install-step-item">
                    <div className="step-number">3</div>
                    <div className="step-text">
                      <strong>Ready to Go!</strong>
                      <span>Click the bookmark or app icon anytime for instant courier dispatch and login.</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="install-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                className="modal-gotit-btn primary-green"
                onClick={() => setShowGuideModal(false)}
                style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', border: 'none' }}
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
