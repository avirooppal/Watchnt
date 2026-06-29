import fs from 'fs';
import path from 'path';

const buildDir = path.resolve(process.cwd(), 'build');
const indexHtmlPath = path.join(buildDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
    console.error('index.html not found in build dir');
    process.exit(1);
}

let html = fs.readFileSync(indexHtmlPath, 'utf8');

// Convert absolute paths to relative paths for Chrome Extension compatibility
html = html.replace(/href="\/app\//g, 'href="./app/');
html = html.replace(/src="\/app\//g, 'src="./app/');

const scriptRegex = /<script>([\s\S]*?)<\/script>/;
const match = scriptRegex.exec(html);

if (match) {
    const scriptContent = match[1];
    
    // Remove document.currentScript.parentElement logic and make dynamic imports relative
    let cleanedScriptContent = scriptContent.replace('const element = document.currentScript.parentElement;', 'const element = document.body.firstElementChild;');
    cleanedScriptContent = cleanedScriptContent.replace(/import\("\/app\//g, 'import("./app/');
    
    // Fix implicit global variable assignment in strict mode
    cleanedScriptContent = cleanedScriptContent.replace(/__sveltekit_/g, 'window.__sveltekit_');

    const scriptFileName = 'inline-script.js';
    const scriptPath = path.join(buildDir, scriptFileName);

    // Create directories if they don't exist
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true });

    // Write the extracted script
    fs.writeFileSync(scriptPath, cleanedScriptContent);

    // Replace inline script with external script
    html = html.replace(scriptRegex, `<script type="module" src="./${scriptFileName}"></script>`);
    fs.writeFileSync(indexHtmlPath, html);
    
    console.log('Successfully extracted inline script and updated paths to relative');
} else {
    // Just write the HTML with relative paths even if no inline script
    fs.writeFileSync(indexHtmlPath, html);
    console.log('No inline script found, but updated paths to relative');
}
