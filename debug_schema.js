const Database = require('better-sqlite3');
const db = new Database('./db/portal.sqlite');

const schema = db.prepare("PRAGMA table_info(issued_docs_voucher)").all();
console.log(schema);

const row = db.prepare("SELECT * FROM issued_docs_voucher WHERE id = 'VOU-20260312-170096'").get();
console.log("Raw DB Row:", row);
