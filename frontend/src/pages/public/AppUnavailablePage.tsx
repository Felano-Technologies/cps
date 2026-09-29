import cpsLogo from '../../assets/logo2.png';

const stars = Array.from({ length: 42 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  top: `${(index * 61) % 82}%`,
  delay: `${(index % 8) * -0.55}s`,
  size: index % 5 === 0 ? 3 : 2,
}));

export default function AppUnavailablePage() {
  return (
    <main className="arcade-lock" role="alert" aria-live="assertive">
      <style>{`
        @keyframes arcade-twinkle { 0%,100% { opacity: .2; transform: scale(.75); } 50% { opacity: 1; transform: scale(1.25); } }
        @keyframes arcade-hover { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes arcade-scan { from { transform: translateY(-100%); } to { transform: translateY(100vh); } }
        @keyframes arcade-glow { 0%,100% { filter: drop-shadow(0 0 8px #ff4dba); } 50% { filter: drop-shadow(0 0 19px #ff4dba); } }
        .arcade-lock { min-height: 100vh; width: 100%; box-sizing: border-box; position: relative; overflow: hidden; display: grid; place-items: center; padding: 32px 20px; color: #f8f7ff; text-align: center; user-select: none; background: radial-gradient(circle at 50% 110%, #28245b 0, #0c1032 42%, #050617 75%); font-family: "Courier New", monospace; }
        .arcade-lock::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .16; background: repeating-linear-gradient(0deg, rgba(255,255,255,.24) 0, rgba(255,255,255,.24) 1px, transparent 1px, transparent 4px); }
        .arcade-lock::after { content: ""; position: absolute; width: 100%; height: 15vh; top: 0; pointer-events: none; background: linear-gradient(transparent, rgba(123,240,255,.08), transparent); animation: arcade-scan 8s linear infinite; }
        .arcade-star { position: absolute; border-radius: 50%; background: #fff; box-shadow: 0 0 7px #a6e8ff; animation: arcade-twinkle 3.4s ease-in-out infinite; }
        .arcade-frame { position: relative; width: min(860px, 100%); padding: clamp(18px, 4vw, 34px); border: 3px solid #6ae6ff; clip-path: polygon(18px 0, calc(100% - 18px) 0, 100% 18px, 100% calc(100% - 18px), calc(100% - 18px) 100%, 18px 100%, 0 calc(100% - 18px), 0 18px); background: rgba(7, 8, 33, .84); box-shadow: 0 0 0 4px rgba(255,77,186,.8), 0 0 0 8px #11123d, 0 0 36px rgba(106,230,255,.65), inset 0 0 54px rgba(139,92,246,.14); }
        .arcade-panel { padding: clamp(26px, 5vw, 54px) clamp(18px, 6vw, 72px); border: 1px solid rgba(255,255,255,.17); background: linear-gradient(135deg, rgba(30,25,80,.74), rgba(11,12,40,.8)); }
        .arcade-logo { width: 138px; max-width: 60%; height: auto; object-fit: contain; margin-bottom: 27px; filter: brightness(0) invert(1) drop-shadow(0 0 7px rgba(106,230,255,.7)); }
        .arcade-alien { width: 104px; height: 76px; margin: 0 auto 30px; position: relative; animation: arcade-hover 2.8s ease-in-out infinite, arcade-glow 2.2s ease-in-out infinite; background: #ff4dba; clip-path: polygon(10% 0, 25% 0, 25% 12%, 38% 12%, 38% 0, 62% 0, 62% 12%, 75% 12%, 75% 0, 90% 0, 90% 25%, 100% 25%, 100% 62%, 88% 62%, 88% 76%, 76% 76%, 76% 88%, 62% 88%, 62% 100%, 38% 100%, 38% 88%, 24% 88%, 24% 76%, 12% 76%, 12% 62%, 0 62%, 0 25%, 10% 25%); }
        .arcade-alien::before, .arcade-alien::after { content: ""; position: absolute; width: 14px; height: 14px; top: 29px; background: #0a0b27; box-shadow: 0 0 0 3px #ffd64d; }
        .arcade-alien::before { left: 24px; } .arcade-alien::after { right: 24px; }
        .arcade-kicker { display: inline-block; margin-bottom: 18px; color: #ffd64d; font-weight: 800; font-size: clamp(11px, 1.7vw, 14px); letter-spacing: .16em; text-transform: uppercase; text-shadow: 0 0 10px rgba(255,214,77,.75); }
        .arcade-title { margin: 0 auto 20px; max-width: 690px; color: #fff; font-size: clamp(30px, 5.3vw, 62px); line-height: 1.02; letter-spacing: -.07em; font-weight: 900; text-transform: uppercase; text-shadow: 4px 4px 0 #ff4dba, 0 0 24px rgba(106,230,255,.55); }
        .arcade-divider { width: min(100%, 440px); height: 4px; margin: 0 auto 25px; background: repeating-linear-gradient(90deg, #6ae6ff 0 14px, transparent 14px 22px); box-shadow: 0 0 10px #6ae6ff; }
        .arcade-copy { max-width: 615px; margin: 0 auto; color: #d7daf7; font-family: Inter, ui-sans-serif, system-ui, sans-serif; font-size: clamp(15px, 2vw, 18px); line-height: 1.7; }
        .arcade-status { max-width: 550px; margin: 30px auto 0; padding: 15px 19px; border: 1px solid rgba(255,214,77,.65); background: rgba(255,214,77,.08); color: #fff1a8; font-size: 12px; font-weight: 700; line-height: 1.6; letter-spacing: .04em; }
        .arcade-footer { margin: 28px 0 0; color: #8f94c4; font-size: 10px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
        @media (prefers-reduced-motion: reduce) { .arcade-lock::after, .arcade-star, .arcade-alien { animation: none; } }
      `}</style>
      {stars.map((star, index) => <i key={index} className="arcade-star" style={{ left: star.left, top: star.top, width: star.size, height: star.size, animationDelay: star.delay }} />)}
      <section className="arcade-frame" aria-label="CPS service availability notice">
        <div className="arcade-panel">
          <img className="arcade-logo" src={cpsLogo} alt="CPS Delivery Services" />
          <div className="arcade-alien" aria-hidden="true" />
          <div className="arcade-kicker">✦ CPS system status ✦</div>
          <h1 className="arcade-title">Game over<br />for now</h1>
          <div className="arcade-divider" aria-hidden="true" />
          <p className="arcade-copy">This app is temporarily unavailable. The owner has failed to honor the financial obligations owed to the developers who invested their time, energy, and resources to build it.</p>
          <div className="arcade-status">PLAYER ACCESS PAUSED — service will return once the outstanding obligations have been resolved.</div>
          <p className="arcade-footer">Insert resolution to continue</p>
        </div>
      </section>
    </main>
  );
}
