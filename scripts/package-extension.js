import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import AdmZip from 'adm-zip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'extension', 'dist');
const zipPath = path.join(rootDir, 'watchnt-extension-v0.1.0.zip');

console.log('Building production extension...');
const result = spawnSync('node', [path.join(__dirname, 'build-extension.js')], { 
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit'
});

if (result.error || result.status !== 0) {
  console.error('Build failed, aborting package.');
  process.exit(1);
}

console.log('\nPackaging extension...');

try {
  const zip = new AdmZip();
  zip.addLocalFolder(distDir);
  zip.writeZip(zipPath);
  
  const stats = fs.statSync(zipPath);
  const bytes = stats.size;
  const mb = (bytes / 1024 / 1024).toFixed(2);
  
  console.log(`\n✅ Success! Extension packaged to ${zipPath}`);
  console.log(`📦 Size: ${bytes} bytes (${mb} MB)`);
} catch (err) {
  console.error('Failed to package zip:', err);
  process.exit(1);
}
