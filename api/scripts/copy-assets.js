const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const assets = [
  ['src/templates', 'dist/templates'],
];

for (const [from, to] of assets) {
  const src = path.join(root, from);
  const dest = path.join(root, to);
  if (!fs.existsSync(src)) continue;
  fs.cpSync(src, dest, { recursive: true });
}
