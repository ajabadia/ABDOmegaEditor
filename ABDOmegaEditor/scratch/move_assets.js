/* eslint-disable */
const fs = require('fs');
const path = require('path');

const srcDir = 'd:/desarrollos/ABDSynthsWeb/abd-ia_synths/public/assets/elements/sequences';
const destDir = 'd:/desarrollos/ABDSynthsWeb/abd-ia_synths/public/assets/sequences';

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

fs.readdirSync(srcDir).forEach(file => {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file);
    fs.renameSync(src, dest);
    console.log(`Moved ${file}`);
});
