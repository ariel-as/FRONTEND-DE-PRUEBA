import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const files = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (entry.startsWith('.')) continue;
    const fullPath = path.join(directory, entry);
    if (statSync(fullPath).isDirectory()) walk(fullPath);
    else files.push(fullPath);
  }
}

function checkReference(fromFile, rawReference, kind) {
  const reference = rawReference.trim();
  if (!reference || /^(?:#|data:|https?:|\/\/|mailto:|tel:|javascript:)/i.test(reference)) return;
  let cleanReference;
  try {
    cleanReference = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
  } catch {
    errors.push(`${path.relative(root, fromFile)}: referencia ${kind} inválida: ${reference}`);
    return;
  }
  if (!cleanReference) return;
  const target = cleanReference.startsWith('/')
    ? path.join(root, cleanReference.slice(1))
    : path.resolve(path.dirname(fromFile), cleanReference);
  if (!target.startsWith(root + path.sep) && target !== root) {
    errors.push(`${path.relative(root, fromFile)}: referencia ${kind} fuera del frontend: ${reference}`);
  } else if (!existsSync(target)) {
    errors.push(`${path.relative(root, fromFile)}: no existe ${kind} ${reference}`);
  }
}

walk(root);
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const jsFiles = files.filter((file) => file.endsWith('.js') || file.endsWith('.mjs'));
const cssFiles = files.filter((file) => file.endsWith('.css'));

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const relative = path.relative(root, file);
  if (!/^\s*<!doctype\s+html\s*>/i.test(html)) errors.push(`${relative}: falta <!doctype html>`);
  for (const match of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    checkReference(file, match[1], 'ruta');
  }
}

for (const file of jsFiles) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\()\s*["'](\.{1,2}\/[^"']+)["']/g)) {
    checkReference(file, match[1], 'import');
  }
}

for (const file of cssFiles) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    checkReference(file, match[1], 'recurso CSS');
  }
}

const allHtml = htmlFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
const bootstrapVersions = [...allHtml.matchAll(/bootstrap@(\d+\.\d+\.\d+)/g)].map((match) => match[1]);
const tailwindReferences = [...allHtml.matchAll(/https:\/\/cdn\.tailwindcss\.com(?:\/[^"']*)?/g)];
if (bootstrapVersions.length === 0) errors.push('No se encontró la dependencia CDN de Bootstrap esperada.');
if (bootstrapVersions.some((version) => version !== '5.3.3')) {
  errors.push(`Bootstrap debe mantenerse en 5.3.3; versiones encontradas: ${[...new Set(bootstrapVersions)].join(', ')}`);
}
if (tailwindReferences.length === 0) errors.push('No se encontró la referencia CDN de Tailwind esperada.');

console.log(`Frontend: ${htmlFiles.length} HTML, ${jsFiles.length} JavaScript, ${cssFiles.length} CSS`);
console.log(`Runtime CI: Node ${process.versions.node}; módulos ES nativos, sin framework ni gestor de paquetes`);
console.log(`Dependencias CDN: Bootstrap ${[...new Set(bootstrapVersions)].join(', ') || 'no detectado'}; Tailwind Play CDN (${tailwindReferences.length} referencias)`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log('Validación de estructura, rutas locales e inventario de dependencias: correcta.');
}
