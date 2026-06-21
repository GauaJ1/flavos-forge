import fs from 'fs';

const log = fs.readFileSync('C:\\Users\\Usuario\\.gemini\\antigravity-ide\\brain\\e88966ad-cd5d-41bc-acff-76bbd6bab468\\.system_generated\\tasks\\task-263.log', 'utf8');
const lines = log.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Result for')) {
    console.log(`Line ${i + 1}: ${lines[i]}`);
  }
}
