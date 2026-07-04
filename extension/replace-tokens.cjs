const fs = require('fs');
const path = require('path');

const replacements = {
  'watchnt-bg': 'signal-ink',
  'watchnt-surface-hover': 'signal-surface-raised',
  'watchnt-surface/50': 'signal-surface-raised',
  'watchnt-surface': 'signal-surface',
  'watchnt-accent-light': 'accent-amber-dim',
  'watchnt-accent/10': 'accent-amber/10',
  'watchnt-accent/20': 'accent-amber/20',
  'watchnt-accent/50': 'accent-amber/50',
  'watchnt-accent': 'accent-amber',
  'watchnt-text-muted': 'text-muted',
  'watchnt-text': 'text-primary',
  'watchnt-border-hover': 'white/20',
  'watchnt-border': 'border-hairline',
  'watchnt-success/10': 'state-success/10',
  'watchnt-success': 'state-success',
  'watchnt-error/10': 'state-danger/10',
  'watchnt-error/20': 'state-danger/20',
  'watchnt-error/70': 'state-danger/70',
  'watchnt-error': 'state-danger',
  'watchnt-warning/10': 'accent-amber/10',
  'watchnt-warning': 'accent-amber',
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  for (const [oldClass, newClass] of Object.entries(replacements)) {
    content = content.split(oldClass).join(newClass);
  }
  
  // Update fonts
  content = content.replace(/text-3xl font-bold/g, 'text-3xl font-display font-bold');
  content = content.replace(/text-2xl font-bold/g, 'text-2xl font-display font-bold');
  content = content.replace(/text-xl font-bold/g, 'text-xl font-display font-bold');
  content = content.replace(/text-lg font-bold/g, 'text-lg font-display font-bold');
  content = content.replace(/h3 className="text-base font-semibold/g, 'h3 className="text-base font-display font-semibold');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Updated', filePath);
  }
}

const dir = 'c:/Users/aviroop/Desktop/WatchNT/extension/src/dashboard';
fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.tsx')) {
    processFile(path.join(dir, file));
  }
});
