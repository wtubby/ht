const fs = require('fs');
const path = require('path');

function walk(dir, exts, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !['node_modules', '.umi', '.git'].includes(e.name)) walk(p, exts, files);
    else if (exts.some((x) => e.name.endsWith(x))) files.push(p);
  }
  return files;
}

const files = walk('src', ['.ts', '.tsx']);

const fileStats = files.map((f) => {
  const base = path.basename(f);
  const rel = f.replace(/\\/g, '/');
  const stem = base.replace(/\.(ts|tsx)$/, '');
  return { name: base, stem, stemLen: stem.length, rel, dir: path.dirname(rel) };
});

fileStats.sort((a, b) => b.stemLen - a.stemLen);
console.log('=== TOP 15 LONGEST FILE STEMS ===');
fileStats.slice(0, 15).forEach((f) => console.log(`${f.stemLen} ${f.rel}`));

const patterns = { PascalCase: 0, camelCase: 0, kebabCase: 0, snake_case: 0, mixed: 0, index: 0 };
for (const f of fileStats) {
  const s = f.stem;
  if (s === 'index') {
    patterns.index++;
    continue;
  }
  if (/^[A-Z][a-zA-Z0-9]*$/.test(s) || /^[A-Z][a-zA-Z0-9]*\.[a-z]+$/.test(s)) patterns.PascalCase++;
  else if (/^[a-z][a-zA-Z0-9]*$/.test(s)) patterns.camelCase++;
  else if (/^[a-z]+(-[a-z]+)*$/.test(s)) patterns.kebabCase++;
  else if (/^[a-z]+(_[a-z]+)*$/.test(s)) patterns.snake_case++;
  else patterns.mixed++;
}
console.log('\n=== FILE NAMING PATTERNS ===', patterns);

const shared = fileStats.filter((f) => f.stem.includes('.shared'));
console.log('\n=== SHARED FILES ===');
shared.forEach((f) => console.log(f.rel));

const fnRegex = /^export\s+(?:async\s+)?(?:function|const)\s+([A-Za-z0-9_]+)/gm;
const typeRegex = /^export\s+(?:type|interface)\s+([A-Za-z0-9_]+)/gm;
const fns = [];
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = fnRegex.exec(content))) fns.push({ name: m[1], file: f.replace(/\\/g, '/'), len: m[1].length });
  while ((m = typeRegex.exec(content)))
    fns.push({ name: m[1], file: f.replace(/\\/g, '/'), len: m[1].length, type: true });
}
fns.sort((a, b) => b.len - a.len);
console.log('\n=== TOP 20 LONGEST EXPORTED NAMES ===');
fns.slice(0, 20).forEach((x) => console.log(`${x.len} ${x.name} (${path.basename(x.file)})`));

const hooks = fns.filter((x) => x.name.startsWith('use') && !x.type);
console.log('\n=== HOOK EXPORTS COUNT:', hooks.length);

const internalFnRegex = /(?:function|const)\s+([a-zA-Z][a-zA-Z0-9]{25,})/g;
const longInternal = [];
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = internalFnRegex.exec(content))) {
    if (!m[1].startsWith('use')) longInternal.push({ name: m[1], len: m[1].length, file: path.basename(f) });
  }
}
longInternal.sort((a, b) => b.len - a.len);
console.log('\n=== LONG INTERNAL NAMES (>=26 chars) ===');
[...new Map(longInternal.map((x) => [x.name, x])).values()].slice(0, 15).forEach((x) =>
  console.log(`${x.len} ${x.name} (${x.file})`),
);

const apiFiles = files.filter((f) => f.includes('services'));
const apiFns = [];
for (const f of apiFiles) {
  const content = fs.readFileSync(f, 'utf8');
  let m;
  const r = /^export\s+async\s+function\s+([A-Za-z0-9_]+)/gm;
  while ((m = r.exec(content))) apiFns.push({ name: m[1], file: path.basename(f), len: m[1].length });
}

const apiPatterns = { getPlural: 0, getSingular: 0, add: 0, update: 0, remove: 0, other: 0 };
apiFns.forEach((a) => {
  if (/^get[A-Z].+s$/.test(a.name) && !a.name.endsWith('Status')) apiPatterns.getPlural++;
  else if (/^get[A-Z]/.test(a.name)) apiPatterns.getSingular++;
  else if (/^add/.test(a.name)) apiPatterns.add++;
  else if (/^update/.test(a.name)) apiPatterns.update++;
  else if (/^remove/.test(a.name)) apiPatterns.remove++;
  else apiPatterns.other++;
});

console.log('\n=== API FUNCTION PATTERNS ===', apiPatterns);
console.log('Avg API fn length:', (apiFns.reduce((s, x) => s + x.len, 0) / apiFns.length).toFixed(1));
console.log('Avg hook export length:', (hooks.reduce((s, x) => s + x.len, 0) / hooks.length).toFixed(1));
console.log(
  'Avg file stem length:',
  (fileStats.filter((f) => f.stem !== 'index').reduce((s, x) => s + x.stemLen, 0) /
    fileStats.filter((f) => f.stem !== 'index').length).toFixed(1),
);

// List hook naming inconsistencies
console.log('\n=== LIST HOOK INCONSISTENCY ===');
const listHooks = hooks.filter((h) => h.name.includes('List') || h.name.endsWith('s') && h.name.startsWith('use'));
listHooks.forEach((h) => console.log(h.name));
