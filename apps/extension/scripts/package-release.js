const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const buildDir = path.join(__dirname, '../dist');
const outputFilePath = path.join(__dirname, '../watchnt-extension-v2.zip');

if (!fs.existsSync(buildDir)) {
    console.error('Build directory not found. Please run build first.');
    process.exit(1);
}

try {
    const zip = new AdmZip();
    zip.addLocalFolder(buildDir);
    zip.writeZip(outputFilePath);
    console.log(`Package successfully created at ${outputFilePath}`);
} catch (e) {
    console.error('Failed to create zip package:', e);
    process.exit(1);
}
