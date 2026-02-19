const Database = require('better-sqlite3');
const db = new Database('./db/portal.sqlite');

console.log('--- Migration Started ---');

const TARGET_TYPES = ['제정공', '제정내'];

try {
    db.transaction(() => {
        TARGET_TYPES.forEach(type => {
            console.log(`Processing ${type}...`);
            // 1. Get all documents of this type, ordered by date (oldest first)
            const docs = db.prepare('SELECT * FROM doc_numbers WHERE docType = ? ORDER BY date ASC, id ASC').all(type);

            let counter = 1;
            docs.forEach(doc => {
                const oldNum = doc.docNum;
                const newNum = `${type}-${counter}`;

                if (oldNum !== newNum) {
                    console.log(`  Updating: ${oldNum} -> ${newNum} (${doc.date})`);

                    // 2. Update doc_numbers
                    db.prepare('UPDATE doc_numbers SET docNum = ? WHERE id = ?').run(newNum, doc.id);

                    // 3. Update related tables (References)
                    // fix_requests
                    db.prepare('UPDATE fix_requests SET docNumber = ? WHERE docNumber = ?').run(newNum, oldNum);

                    // inquiries (Case Management Ledger)
                    db.prepare('UPDATE inquiries SET docNum = ? WHERE docNum = ?').run(newNum, oldNum);
                }
                counter++;
            });
            console.log(`  Processed ${docs.length} documents for ${type}.`);
        });
    })();
    console.log('--- Migration Completed Successfully ---');
} catch (e) {
    console.error('Migration Failed:', e);
}
