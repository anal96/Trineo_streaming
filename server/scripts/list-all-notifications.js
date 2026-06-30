import fs from 'fs';
import path from 'path';

const controllersDir = './server/src/controllers';
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));

console.log(`\nFound ${files.length} controller files. Searching for 'Notification'...`);

for (const file of files) {
  const filePath = path.join(controllersDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (content.toLowerCase().includes('notification')) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes('notification.create') || line.toLowerCase().includes('notification.insertmany')) {
        console.log(`[${file}:${index + 1}] => ${line.trim()}`);
        // Let's print the next 8 lines
        for (let i = 1; i <= 8; i++) {
          if (lines[index + i]) {
            console.log(`    ${lines[index + i].trim()}`);
          }
        }
        console.log('---');
      }
    });
  }
}
