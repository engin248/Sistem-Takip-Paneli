const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
        if (!dirPath.includes('node_modules') && !dirPath.includes('.next')) {
            walkDir(dirPath, callback);
        }
    } else {
        callback(dirPath);
    }
  });
}

const words = new Set();

walkDir('./src', (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Find all continuous strings of characters that include at least one non-ASCII character
    const matches = content.match(/[^\s'"<>{}[\](),;:]*[^\x00-\x7F]+[^\s'"<>{}[\](),;:]*/g);
    if (matches) {
      matches.forEach(m => words.add(m));
    }
  }
});

const sorted = Array.from(words).sort();
const outPath = 'scratch.txt';
fs.writeFileSync(outPath, sorted.join('\n'));
console.log('Done! Extracted ' + sorted.length + ' unique non-ASCII words.');
