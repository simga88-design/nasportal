const db = require('../db');

function syncLinkedDocStatus(linkedDocId, newStatus) {
    if (!linkedDocId) return;
    try {
        db.prepare(`UPDATE issued_docs SET status = ? WHERE id = ?`).run(newStatus, linkedDocId);
        console.log(`[Doc Cascade] linked doc ${linkedDocId} updated to ${newStatus}`);
    } catch (e) {
        console.error('[Doc Cascade Error]', e);
    }
}

module.exports = {
    syncLinkedDocStatus
};
