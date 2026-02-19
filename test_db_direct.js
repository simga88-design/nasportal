const Database = require('better-sqlite3');
const path = require('path');
const db = new Database('./db/portal.sqlite');

const approval_id = 'test_multi_redraft_' + Date.now();
const drafter_id = 'test_user';

function draft(cycleNum, isRedraft) {
    const title = 'Test Docs';
    const type = 'GENERAL';
    const content = { text: 'Hello ' + cycleNum, drafter_comment: 'Draft ' + cycleNum + ' Comment', history: [] };
    const lines = [{ approver_id: 'admin', approver_name: 'Admin' }];

    db.transaction(() => {
        if (isRedraft) {
            const oldDoc = db.prepare(`SELECT content, drafter_id FROM approvals WHERE id = ?`).get(approval_id);
            const parsedOldContent = JSON.parse(oldDoc.content || '{}');

            const oldLines = db.prepare(`SELECT * FROM approval_lines WHERE approval_id = ? ORDER BY step_order ASC`).all(approval_id);

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

            let oldHistory = [];
            if (parsedOldContent.history && Array.isArray(parsedOldContent.history)) {
                oldHistory = parsedOldContent.history;
            }

            console.log(`[Draft ${cycleNum}] oldHistory len: ${oldHistory.length}, historyToAdd len: ${historyToAdd.length}`);

            if (historyToAdd.length > 0) {
                content.history = oldHistory.concat(historyToAdd);
            } else if (oldHistory.length > 0) {
                content.history = oldHistory;
            }

            console.log(`[Draft ${cycleNum}] content.history len: ${(content.history || []).length}`);

            db.prepare(`UPDATE approvals SET title = ?, type = ?, content = ?, status = 'IN_PROGRESS', current_step = 0, created_at = CURRENT_TIMESTAMP WHERE id = ?`)
                .run(title, type, JSON.stringify(content), approval_id);
            db.prepare(`DELETE FROM approval_lines WHERE approval_id = ?`).run(approval_id);
        } else {
            console.log(`[Draft ${cycleNum}] Initial creation`);
            db.prepare(`INSERT INTO approvals (id, drafter_id, title, type, content, status, current_step) VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', 0)`)
                .run(approval_id, drafter_id, title, type, JSON.stringify(content));
        }

        const lineStmt = db.prepare(`INSERT INTO approval_lines (approval_id, step_order, approver_id, approver_name, status) VALUES (?, ?, ?, ?, 'WAITING')`);
        lines.forEach((line, idx) => {
            lineStmt.run(approval_id, idx, line.approver_id, line.approver_name);
        });

        db.prepare(`UPDATE approval_lines SET status = 'PENDING' WHERE approval_id = ? AND step_order = 0`).run(approval_id);
    })();
}

function reject(cycleNum) {
    db.transaction(() => {
        const app = db.prepare(`SELECT * FROM approvals WHERE id = ?`).get(approval_id);
        const line = db.prepare(`SELECT * FROM approval_lines WHERE approval_id = ? AND approver_id = 'admin' AND status = 'PENDING'`).get(approval_id);

        db.prepare(`UPDATE approval_lines SET status = 'REJECTED', comment = ?, acted_at = CURRENT_TIMESTAMP WHERE approval_id = ? AND step_order = ?`)
            .run('Reject ' + cycleNum + ' Comment', approval_id, line.step_order);
        db.prepare(`UPDATE approvals SET status = 'REJECTED' WHERE id = ?`).run(approval_id);
    })();
}

function printHistory() {
    const doc = db.prepare(`SELECT content FROM approvals WHERE id = ?`).get(approval_id);
    const content = JSON.parse(doc.content);
    console.log("FINAL HISTORY:", JSON.stringify(content.history, null, 2));
}

draft(1, false);
reject(1);

draft(2, true);
reject(2);

draft(3, true);
reject(3);

draft(4, true);

printHistory();
