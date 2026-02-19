const http = require('http');

const BASE_URL = 'http://localhost/api/auth';

function post(action, data) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ action, ...data });
        const req = http.request(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function run() {
    try {
        console.log("=== 1. Create Approval ===");
        const createRes = await post('create_approval', {
            drafter_id: 'test_user',
            title: 'Test Redraft Bug',
            type: 'GENERAL',
            content: { text: 'Hello', drafter_comment: 'Please approve!', history: [] },
            lines: [{ approver_id: 'admin', approver_name: 'Admin' }]
        });
        const docId = createRes.approval_id;

        console.log("=== 2. Reject Approval ===");
        await post('update_approval_status', {
            approval_id: docId,
            approver_id: 'admin',
            status: 'REJECTED',
            comment: 'Fix the typo'
        });

        console.log("=== 3. Simulate doc_issue.html redirection (autoDraft) ===");
        // approval.html init() tries to fetch the history like this:
        const getRes = await post('get_approvals', { user_id: 'test_user' }); // No mode!
        console.log("Did get_approvals return the old doc?", !!getRes.list.find(d => d.id === docId));

        const oldItem = getRes.list.find(a => a.id === docId);
        let draftExistingHistory = [];
        if (oldItem && oldItem.content) {
            draftExistingHistory = oldItem.content.history || [];
        } else {
            console.log("WARNING: oldItem not found in get_approvals without mode!");
        }

        console.log("=== 4. Submit Redraft ===");
        const redraftRes = await post('create_approval', {
            id: docId,
            drafter_id: 'test_user',
            title: '[재상신] Test Redraft Bug',
            type: 'GENERAL',
            content: { text: 'Hello Fixed', drafter_comment: 'Fixed it!', history: draftExistingHistory },
            lines: [{ approver_id: 'admin', approver_name: 'Admin' }]
        });

        console.log("=== 5. Final History ===");
        const getRes2 = await post('get_approvals', { user_id: 'test_user', mode: 'sent' });
        const doc2 = getRes2.list.find(d => d.id === docId);
        console.log("Final History in DB:", doc2.content.history);

    } catch (e) {
        console.error("Test failed:", e);
    }
}

run();
