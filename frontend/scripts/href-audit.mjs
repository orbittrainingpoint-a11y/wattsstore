import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.tsx$/.test(e)) out.push(p);
  }
  return out;
}

const root = process.argv[2] || '.';
const files = [...walk(`${root}/src/app`), ...walk(`${root}/src/components`)];
const refs = new Set();

// Catch: href="...", href='...', href={`...`}, href={'...'}, href={"..."}
const patterns = [
  /href=["']([^"']+)["']/g,                       // href="..."
  /href=\{\s*`([^`]+)`\s*\}/g,                    // href={`...`}
  /href=\{\s*["']([^"']+)["']\s*\}/g,             // href={"..."}
];

function clean(h) {
  if (h.startsWith('http') || h.startsWith('mailto') || h.startsWith('#')) return null;
  h = h.replace(/\$\{region\}/g, '[c]')
       .replace(/\$\{params\.country\}/g, '[c]')
       .replace(/\$\{[^}]+\}/g, '*');
  h = h.replace(/^\/(ae|ke|de|global)\b/g, '/[c]');
  return h;
}

for (const f of files) {
  const src = readFileSync(f, 'utf-8');
  for (const re of patterns) {
    let m;
    while ((m = re.exec(src))) {
      const cleaned = clean(m[1]);
      if (cleaned) refs.add(cleaned);
    }
  }
}

console.log([...refs].sort().join('\n'));
