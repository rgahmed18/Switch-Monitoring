const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.component.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src/app');
let modifiedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Check if it's a standalone component
  if (content.includes('standalone: true')) {
    // Check if CommonModule is imported
    if (!content.includes('import { CommonModule }')) {
      // Find the last import
      // or just add it after first import
      const firstImportIndex = content.indexOf('import ');
      if (firstImportIndex !== -1) {
         content = "import { CommonModule } from '@angular/common';\n" + content;
         changed = true;
      }
    }

    // Now inject it into imports array
    // Matches imports: [ ... ] or imports: [...]
    // Caution: could be multiline
    const importRegex = /imports\s*:\s*\[([^\]]*)\]/;
    const match = importRegex.exec(content);
    if (match) {
       const importsList = match[1];
       if (!importsList.includes('CommonModule')) {
           const newImportsList = importsList.trim() ? importsList + ', CommonModule' : 'CommonModule';
           content = content.replace(importRegex, `imports: [${newImportsList}]`);
           changed = true;
       }
    } else {
       // if imports array doesn't exist but standalone: true does
       const standaloneRegex = /standalone\s*:\s*true,/;
       if (content.match(standaloneRegex)) {
           content = content.replace(standaloneRegex, "standalone: true,\n  imports: [CommonModule],");
           changed = true;
       }
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
    console.log(`Updated ${file}`);
  }
}

console.log(`Successfully injected CommonModule into ${modifiedCount} standalone components.`);
