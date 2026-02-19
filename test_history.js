const db = require('./db');

// 1. Create a mock document and lines
const id = 'TEST-REDRAFT-1';
const drafter_id = 'user1';
const initialContent = {
    text: 'Hello World',
    drafter_comment: 'Please approve this',
    history: []
};

try {
    // Clear first
    db.prepare('DELETE FROM approvals WHERE id = ?').run(id);
    db.prepare('DELETE FROM approval_lines WHERE approval_id = ?').run(id);

    // Draft
    db.prepare(`INSERT INTO approvals (id, drafter_id, title, type, content, status, current_step) VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', 0)`)
        .run(id, drafter_id, 'Test Doc', 'GENERAL', JSON.stringify(initialContent));

    // Add pending line and then reject it
    db.prepare(`INSERT INTO approval_lines (approval_id, step_order, approver_id, approver_name, status, comment, acted_at) VALUES (?, ?, ?, ?, 'REJECTED', 'No way', CURRENT_TIMESTAMP)`)
        .run(id, 0, 'approver1', 'Approver One');

    // Redraft Logic (Simulate the exact code in server.js)
    const oldDoc = db.prepare(`SELECT content, drafter_id FROM approvals WHERE id = ?`).get(id);
    const parsedOldContent = JSON.parse(oldDoc.content || '{}');
    const oldLines = db.prepare(`SELECT * FROM approval_lines WHERE approval_id = ? ORDER BY step_order ASC`).all(id);

    let historyToAdd = oldLines
        .filter(l => l.status !== 'WAITING' && l.status !== 'PENDING')
        .map(l => ({
            approver_name: l.approver_name,
            approver_id: l.approver_id,
            status: l.status,
            comment: l.comment,
            acted_at: l.acted_at
        }));

    if (parsedOldContent.drafter_comment) {
        historyToAdd.unshift({
            approver_name: '기안자',
            approver_id: oldDoc.drafter_id,
            status: 'DRAFTED',
            comment: parsedOldContent.drafter_comment,
            acted_at: new Date().toISOString()
        });
    }

    // Simulate payload content from frontend: 
    // It should have whatever was in item.content.history previously
    let newContentPayload = {
        text: 'Hello World v2',
        drafter_comment: 'Please approve this time',
        history: parsedOldContent.history || [] // this simulates window.draftExistingHistory
    };

    if (historyToAdd.length > 0) {
        newContentPayload.history = (newContentPayload.history || []).concat(historyToAdd);
    }

    console.log("OLD CONTENT:", initialContent);
    console.log("HISTORY TO ADD:", historyToAdd);
    console.log("FINAL CONTENT.HISTORY:", newContentPayload.history);

} catch (e) {
    console.error(e);
}
