const Database = require('better-sqlite3');
const db = new Database('./db/portal.sqlite');

const id = 'VOU-20260312-170096';
console.log(`Searching for ${id}...`);

// Check voucher table
const doc = db.prepare('SELECT * FROM issued_docs_voucher WHERE id = ?').get(id);

if (doc) {
    console.log("Found in issued_docs_voucher:");
    console.log(`ID: ${doc.id}`);
    console.log(`Title: ${doc.title}`);
    console.log(`Issuer: ${doc.issuer}`);
    console.log(`Type: ${doc.docType}`);
    console.log(`Content JSON Length: ${doc.content_json ? doc.content_json.length : 'null'}`);
    try {
        const parsed = JSON.parse(doc.content_json);
        console.log("Content parses successfully.");
    } catch(e) {
        console.error("Content JSON parsing failed:", e.message);
        console.log("Raw content sample:", doc.content_json ? doc.content_json.substring(0, 100) : 'null');
    }
} else {
    console.log("Not found in issued_docs_voucher. Checking other tables...");
    const tables = ['doc_numbers', 'doc_numbers_jejeongnae', 'doc_numbers_jejeongyeon', 'issued_docs_report', 'issued_docs_biz_trip', 'issued_docs_case_meeting', 'issued_docs_emergency'];
    let foundAnywhere = false;
    for (const t of tables) {
        try {
            const row = db.prepare(`SELECT * FROM ${t} WHERE id = ?`).get(id);
            if (row) {
                console.log(`Found in table: ${t}`);
                foundAnywhere = true;
                break;
            }
        } catch(e) {}
    }
    if (!foundAnywhere) console.log("Document does not exist anywhere in the DB.");
}
