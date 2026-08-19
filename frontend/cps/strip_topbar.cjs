const fs = require('fs');
const path = require('path');
const dir = 'd:/bhim/CPSApp/frontend/cps/src/screens';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('<header className="topbar">')) {
    // Remove the entire <header className="topbar"> block
    content = content.replace(/<header className="topbar">[\s\S]*?<\/header>\n/, '');
    
    // Also remove the import statement for cpsLogo
    content = content.replace(/import cpsLogo from '\.\.\/assets\/cps-logo\.png';\n/, '');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Removed topbar from ' + f);
  }
});
