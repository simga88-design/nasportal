const Database = require('better-sqlite3');
const db = new Database('./db/portal.sqlite');

try {
    // Clear notifications
    db.prepare('DELETE FROM notifications').run();
    console.log("Cleared notifications table.");

    // Clear issued_docs (pre-approval documents)
    db.prepare('DELETE FROM issued_docs').run();
    console.log("Cleared issued_docs table.");

    console.log("All related test data initialized.");
} catch (e) {
    console.error("Error clearing DB:", e.message);
}
