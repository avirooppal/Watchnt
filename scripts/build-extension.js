import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extDir = path.resolve(__dirname, '../extension');
const distDir = path.join(extDir, 'dist');

const isWatch = process.argv.includes('--watch');

const entryPoints = [
  { in: path.join(extDir, 'src/background/index.js'), out: 'background/index', format: 'iife' },
  { in: path.join(extDir, 'src/content/youtube.js'), out: 'content/youtube', format: 'iife' },
  { in: path.join(extDir, 'src/content/bridge.js'), out: 'content/bridge', format: 'iife' },
  { in: path.join(extDir, 'src/content/meet.js'), out: 'content/meet', format: 'iife' },
  { in: path.join(extDir, 'src/content/generic.js'), out: 'content/generic', format: 'iife' },
  { in: path.join(extDir, 'src/content/audio-capture.js'), out: 'content/audio-capture', format: 'iife' },
  { in: path.join(extDir, 'src/popup/popup.js'), out: 'popup/popup', format: 'iife' },
  { in: path.join(extDir, 'src/content/overlay.js'), out: 'content/overlay', format: 'iife' },
  { in: path.join(extDir, 'src/dashboard/App.jsx'), out: 'dashboard/app', format: 'esm' }
];

async function copyAssets() {
  const assetsToCopy = [
    { src: 'src/assets', dest: 'dist/assets' },
    { src: 'manifest.json', dest: 'dist/manifest.json' },
    { src: 'src/popup/index.html', dest: 'dist/popup/index.html' },
    { src: 'src/popup/popup.css', dest: 'dist/popup/popup.css' },
    { src: 'src/dashboard/index.html', dest: 'dist/dashboard/index.html' },
    { src: 'src/dashboard/app.css', dest: 'dist/dashboard/app.css' }
  ];

  for (const { src, dest } of assetsToCopy) {
    const srcPath = path.join(extDir, src);
    const destPath = path.join(extDir, dest);
    if (fs.existsSync(srcPath)) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.cpSync(srcPath, destPath, { recursive: true });
    }
  }
  console.log('Assets copied.');
}

async function build() {
  for (const entry of entryPoints) {
    if (!fs.existsSync(entry.in)) {
      console.warn(`[Warning] Entry point not found, skipping for now: ${entry.in}`);
      continue;
    }
    const isProd = process.env.NODE_ENV === 'production';
    const buildOptions = {
      entryPoints: [entry.in],
      outfile: path.join(distDir, `${entry.out}.js`),
      bundle: true,
      platform: 'browser',
      format: entry.format,
      loader: { '.js': 'jsx', '.jsx': 'jsx' },
      minify: isProd,
      define: isProd ? { 'process.env.NODE_ENV': '"production"' } : {}
    };
    
    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
    } else {
      await esbuild.build(buildOptions);
    }
  }

  await copyAssets();
  
  if (isWatch) {
    console.log('Watching for changes...');
  } else {
    console.log('Build complete.');
  }
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
