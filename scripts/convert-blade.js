#!/usr/bin/env node
/**
 * Konverter template Blade (Laravel) -> EJS (NestJS).
 *
 * Dipakai untuk memindahkan seluruh isi `resources/views` milik project
 * `approval_befa` ke folder `views` pada project ini. Script disertakan supaya
 * proses migrasi dapat diulang bila ada perubahan pada view lama.
 *
 * Pemakaian:
 *   node scripts/convert-blade.js ../approval_befa/resources/views ./views
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE = process.argv[2] || path.join('..', 'approval_befa', 'resources', 'views');
const TARGET = process.argv[3] || path.join(__dirname, '..', 'views');

// ---------------------------------------------------------------------------
// Ekspresi PHP -> JavaScript
// ---------------------------------------------------------------------------

function phpExpression(expr) {
  let out = expr;

  // $variable -> variable
  out = out.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, '$1');

  // $obj->prop -> obj.prop
  out = out.replace(/->/g, '.');

  // Konkatenasi PHP " . " -> " + " (titik di dalam string tidak tersentuh
  // karena selalu tanpa spasi, contoh: config('app.url')).
  out = out.replace(/(['")\]\w])\s+\.\s+(['"$\w(])/g, '$1 + $2');

  // PHP `and`/`or` -> operator JS
  out = out.replace(/\s+\band\b\s+/g, ' && ').replace(/\s+\bor\b\s+/g, ' || ');

  return out.trim();
}

function phpStatements(code) {
  return code
    .split('\n')
    .map((line) => phpExpression(line))
    .join('\n')
    .trim();
}

/** Ambil isi kurung berimbang mulai dari posisi `start` (harus '('). */
function readBalanced(text, start) {
  if (text[start] !== '(') return null;

  let depth = 0;
  let quote = null;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (quote) {
      if (ch === '\\') {
        i += 1;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }

    if (ch === '(') depth += 1;
    if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        return { inner: text.slice(start + 1, i), end: i + 1 };
      }
    }
  }

  return null;
}

/** Ganti direktif berargumen (@if, @elseif, @foreach, @for) dengan hasil `build`. */
function replaceDirective(source, name, build) {
  const needle = `@${name}`;
  let out = '';
  let index = 0;

  for (;;) {
    const found = source.indexOf(needle, index);
    if (found === -1) {
      out += source.slice(index);
      return out;
    }

    // pastikan bukan bagian dari kata lain (@endforeach vs @foreach)
    const after = source[found + needle.length];
    if (after !== undefined && /[A-Za-z0-9_]/.test(after)) {
      out += source.slice(index, found + needle.length);
      index = found + needle.length;
      continue;
    }

    let cursor = found + needle.length;
    while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;

    const balanced = readBalanced(source, cursor);
    if (!balanced) {
      out += source.slice(index, found + needle.length);
      index = found + needle.length;
      continue;
    }

    out += source.slice(index, found);
    out += build(balanced.inner);
    index = balanced.end;
  }
}

function convertForeach(inner) {
  const expression = inner.trim();
  const withKey = expression.match(/^(.*?)\s+as\s+(\$[A-Za-z_][A-Za-z0-9_]*)\s*=>\s*(\$[A-Za-z_][A-Za-z0-9_]*)\s*$/s);

  if (withKey) {
    const list = phpExpression(withKey[1]);
    const key = phpExpression(withKey[2]);
    const value = phpExpression(withKey[3]);
    return `<% for (const [${key}, ${value}] of entries(${list})) { %>`;
  }

  const simple = expression.match(/^(.*?)\s+as\s+(\$[A-Za-z_][A-Za-z0-9_]*)\s*$/s);
  if (simple) {
    const list = phpExpression(simple[1]);
    const value = phpExpression(simple[2]);
    return `<% for (const ${value} of arr(${list})) { %>`;
  }

  return `<% /* foreach tidak dikenali: ${expression} */ %>`;
}

function convertFor(inner) {
  const parts = inner.split(';');
  if (parts.length !== 3) {
    return `<% for (${phpExpression(inner)}) { %>`;
  }
  const init = phpExpression(parts[0]);
  const cond = phpExpression(parts[1]);
  const step = phpExpression(parts[2]);
  return `<% for (let ${init.replace(/^let\s+/, '')}; ${cond}; ${step}) { %>`;
}

// ---------------------------------------------------------------------------
// Blade -> EJS
// ---------------------------------------------------------------------------

function convert(source) {
  let out = source;

  // 1. komentar blade
  out = out.replace(/\{\{--[\s\S]*?--\}\}/g, '');

  // 2. blok @php ... @endphp
  out = out.replace(/@php\b([\s\S]*?)@endphp/g, (_, code) => `<% ${phpStatements(code)} %>`);

  // 3. tag PHP mentah yang masih tersisa di beberapa view
  out = out.replace(/<\?php\s+echo\s+([\s\S]*?)\s*\?>/g, (_, expr) => `<%= ${phpExpression(expr.replace(/;$/, ''))} %>`);
  out = out.replace(/<\?php\s+if\s*\(([\s\S]*?)\)\s*:\s*\?>/g, (_, expr) => `<% if (${phpExpression(expr)}) { %>`);
  out = out.replace(/<\?php\s+elseif\s*\(([\s\S]*?)\)\s*:\s*\?>/g, (_, expr) => `<% } else if (${phpExpression(expr)}) { %>`);
  out = out.replace(/<\?php\s+else\s*:\s*\?>/g, '<% } else { %>');
  out = out.replace(/<\?php\s+endif\s*;?\s*\?>/g, '<% } %>');
  out = out.replace(/<\?php\s+endforeach\s*;?\s*\?>/g, '<% } %>');

  // 4. @include('template.header') -> include('template/header')
  out = out.replace(/@include\(\s*['"]([^'"]+)['"]\s*\)/g, (_, view) => `<%- include('${view.replace(/\./g, '/')}') %>`);

  // 5. @csrf (API NestJS tidak memakai CSRF token)
  out = out.replace(/@csrf\b/g, '');

  // 6. direktif berargumen
  out = replaceDirective(out, 'foreach', convertForeach);
  out = replaceDirective(out, 'for', convertFor);
  out = replaceDirective(out, 'elseif', (inner) => `<% } else if (${phpExpression(inner)}) { %>`);
  out = replaceDirective(out, 'if', (inner) => `<% if (${phpExpression(inner)}) { %>`);

  // 7. direktif tanpa argumen
  out = out.replace(/@endforeach\b/g, '<% } %>');
  out = out.replace(/@endfor\b/g, '<% } %>');
  out = out.replace(/@endif\b/g, '<% } %>');
  out = out.replace(/@else\b/g, '<% } else { %>');
  out = out.replace(/@auth\b/g, '<% if (false) { %>');
  out = out.replace(/@endauth\b/g, '<% } %>');

  // 8. echo blade
  out = out.replace(/\{\{\s*([\s\S]*?)\s*\}\}/g, (_, expr) => `<%= ${phpExpression(expr)} %>`);
  out = out.replace(/\{!!\s*([\s\S]*?)\s*!!\}/g, (_, expr) => `<%- ${phpExpression(expr)} %>`);

  return out;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

function targetName(fileName) {
  // send.blade.php -> send.ejs ; after.blade_backup.php -> after.blade_backup.ejs
  if (fileName.endsWith('.blade.php')) return `${fileName.slice(0, -'.blade.php'.length)}.ejs`;
  if (fileName.endsWith('.php')) return `${fileName.slice(0, -'.php'.length)}.ejs`;
  return fileName;
}

function walk(dir, relative = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let converted = 0;

  for (const entry of entries) {
    const from = path.join(dir, entry.name);
    const rel = path.join(relative, entry.name);

    if (entry.isDirectory()) {
      converted += walk(from, rel);
      continue;
    }
    if (!entry.name.endsWith('.php')) continue;

    const to = path.join(TARGET, path.dirname(rel), targetName(entry.name));
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, convert(fs.readFileSync(from, 'utf8')), 'utf8');
    converted += 1;
  }

  return converted;
}

if (require.main === module) {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Folder sumber tidak ditemukan: ${SOURCE}`);
    process.exit(1);
  }
  const total = walk(SOURCE);
  console.log(`${total} template dikonversi ke ${TARGET}`);
}

module.exports = { convert, phpExpression };
