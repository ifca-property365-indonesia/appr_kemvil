#!/usr/bin/env node
/**
 * Padanan `php artisan key:generate` - membuat APP_KEY baru dan menuliskannya
 * ke file .env.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const key = `base64:${crypto.randomBytes(32).toString('base64')}`;
const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  console.log(key);
  process.exit(0);
}

const content = fs.readFileSync(envPath, 'utf8');
const updated = /^APP_KEY=.*$/m.test(content)
  ? content.replace(/^APP_KEY=.*$/m, `APP_KEY=${key}`)
  : `${content.trimEnd()}\nAPP_KEY=${key}\n`;

fs.writeFileSync(envPath, updated);
console.log(`APP_KEY diperbarui: ${key}`);
