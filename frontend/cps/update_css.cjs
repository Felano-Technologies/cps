const fs = require('fs');
const path = require('path');
const cssPath = 'd:/bhim/CPSApp/frontend/cps/src/App.css';
let css = fs.readFileSync(cssPath, 'utf8');

// Update Topbar backdrop blur
css = css.replace(
  /background-color: #ffffff;/g,
  'background-color: rgba(255, 255, 255, 0.95);\n  backdrop-filter: blur(8px);'
);

// Overhaul button styles
css = css.replace(/border-radius: 4px;/g, 'border-radius: 9999px;');
css = css.replace(/border-radius: 6px;/g, 'border-radius: 9999px;');
css = css.replace(/border-radius: 8px;/g, 'border-radius: 1.5rem;');

// Overhaul Card styles
css = css.replace(/border-radius: 12px;/g, 'border-radius: 2rem;');
css = css.replace(/border-radius: 16px;/g, 'border-radius: 2rem;');

// Nav links active update
css = css.replace(/background-color: #ecfdf5;/g, 'background-color: var(--success-bg);');

// Typography addition
if (!css.includes('Plus Jakarta Sans')) {
  css += '\n\nh1, h2, h3, h4, h5, h6 { font-family: "Plus Jakarta Sans", sans-serif; letter-spacing: -0.03em; font-weight: 800; color: var(--navy); }';
}

fs.writeFileSync(cssPath, css);
console.log('App.css updated successfully.');
