const Database = require('better-sqlite3');
const db = new Database('./db/portal.sqlite');
try {
    db.exec('DELETE FROM approvals');
    db.exec('DELETE FROM approval_lines');
    // NOTE: Keep saved_lines unless explicitly told, users might want to keep their approval line templates.
    console.log('Successfully cleared approvals and approval_lines');
} catch (e) {
    console.error('Error clearing DB:', e);
}
