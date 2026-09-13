const fs = require('fs');
const path = require('path');

const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build']);
const ALLOWED_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.sql', '.md']);

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (!IGNORED_DIRS.has(file)) {
                results = results.concat(walk(fullPath));
            }
        } else {
            const ext = path.extname(file);
            if (ALLOWED_EXTS.has(ext)) {
                results.push(fullPath);
            }
        }
    });
    return results;
}

function processFiles(search, replace) {
    const files = walk(__dirname);
    let modifiedCount = 0;

    files.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const regex = new RegExp(search, 'g');
        if (regex.test(content)) {
            const newContent = content.replace(regex, replace);
            fs.writeFileSync(file, newContent, 'utf8');
            modifiedCount++;
            console.log(`Updated: ${file}`);
        }
    });

    console.log(`\nReplaced "${search}" with "${replace}" in ${modifiedCount} files.`);
}

function main() {
    console.log('--- GLOBAL REGEX REFACTOR TOOL ---');
    console.log('Scanning project...');
    
    // Configured for the Synapse rebrand
    processFiles('Jarvis', 'Synapse');
    processFiles('JARVIS', 'SYNAPSE');
    processFiles('letjarvis', 'synapse');
    
    console.log('Refactoring complete.');
}

// Run automatically
main();
