const Database = require('better-sqlite3');
const db = new Database('./db/portal.sqlite');

const rows = db.prepare("SELECT id, type, target_name, issuer, created_at FROM issued_docs_voucher ORDER BY created_at DESC LIMIT 5").all();
console.log("Recent vouchers:");
console.table(rows);
