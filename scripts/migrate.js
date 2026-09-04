#!/usr/bin/env node
/**
 * Menjalankan file SQL pada folder `database/` terhadap koneksi BEFA.
 * Pemakaian: npm run migrate
 */
'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const bool = (value, fallback) => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw);
};

const strip = (value) => {
  const raw = String(value ?? '').trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
};

async function main() {
  const pool = await new sql.ConnectionPool({
    server: strip(process.env.DB_HOST2) || '127.0.0.1',
    port: Number(process.env.DB_PORT2 || 1433),
    database: strip(process.env.DB_DATABASE2) || 'BEFA',
    user: strip(process.env.DB_USERNAME2) || 'mgr',
    password: strip(process.env.DB_PASSWORD2) || '',
    options: {
      encrypt: bool(process.env.DB_ENCRYPT2, false),
      trustServerCertificate: bool(process.env.DB_TRUST_SERVER_CERTIFICATE2, true),
      enableArithAbort: true,
    },
  }).connect();

  const dir = path.join(__dirname, '..', 'database');
  const files = fs.readdirSync(dir).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const batches = content.split(/^\s*GO\s*$/im).map((b) => b.trim()).filter(Boolean);

    for (const batch of batches) {
      await pool.request().batch(batch);
    }
    console.log(`OK  ${file}`);
  }

  await pool.close();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
