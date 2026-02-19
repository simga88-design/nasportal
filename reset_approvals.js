const Database = require('better-sqlite3');
const db = new Database('./db/portal.sqlite');

try {
    db.prepare('DELETE FROM approvals').run();
    db.prepare('DELETE FROM approval_lines').run();
    console.log("E-Approval database initialized (approvals and approval_lines tables cleared).");
} catch (e) {
    console.error("Error clearing DB:", e.message);
}
