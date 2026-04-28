import XLSX from 'xlsx';
import fs from 'fs';

const wb = XLSX.readFile('/tmp/data.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
console.log('count', rows.length);
console.log('keys', Object.keys(rows[0]));
console.log('sample', JSON.stringify(rows[0], null, 2));

// Normalize: try to detect korean column names
const map = (r) => {
  const o = {};
  for (const k of Object.keys(r)) {
    const v = r[k];
    const key = k.trim();
    o[key] = v;
  }
  return o;
};
const normalized = rows.map(map);
fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/shops.json', JSON.stringify(normalized));
console.log('written', normalized.length);
