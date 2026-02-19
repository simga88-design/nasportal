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
        console.log("=== 1. First Draft ===");
        const createRes = await post('create_approval', {
            drafter_id: 'test_user',
            title: 'Multi Redraft Test',
            type: 'GENERAL',
            content: { text: 'Hello', drafter_comment: 'Draft 1 Comment', history: [] },
            lines: [{ approver_id: 'admin', approver_name: 'Admin' }]
        });
        const docId = createRes.approval_id;

        console.log("=== 2. First Reject ===");
        await post('update_approval_status', {
            approval_id: docId,
            approver_id: 'admin',
            status: 'REJECTED',
            comment: 'Reject 1 Comment'
        });

        console.log("=== 3. Second Draft (Redraft 1) ===");
        await post('create_approval', {
            id: docId,
            drafter_id: 'test_user',
            title: '[재상신] Multi Redraft Test',
            type: 'GENERAL',
            content: { text: 'Hello Fixed', drafter_comment: 'Draft 2 Comment' },
            lines: [{ approver_id: 'admin', approver_name: 'Admin' }]
        });

        console.log("=== 4. Second Reject ===");
        await post('update_approval_status', {
            approval_id: docId,
            approver_id: 'admin',
            status: 'REJECTED',
            comment: 'Reject 2 Comment'
        });

        console.log("=== 5. Third Draft (Redraft 2) ===");
        await post('create_approval', {
            id: docId,
            drafter_id: 'test_user',
            title: '[재상신] Multi Redraft Test',
            type: 'GENERAL',
            content: { text: 'Hello Fixed 2', drafter_comment: 'Draft 3 Comment' },
            lines: [{ approver_id: 'admin', approver_name: 'Admin' }]
        });

        console.log("=== 6. Third Reject ===");
        await post('update_approval_status', {
            approval_id: docId,
            approver_id: 'admin',
            status: 'REJECTED',
            comment: 'Reject 3 Comment'
        });

        console.log("=== 7. Fourth Draft (Redraft 3) ===");
        await post('create_approval', {
            id: docId,
            drafter_id: 'test_user',
            title: '[재상신] Multi Redraft Test',
            type: 'GENERAL',
            content: { text: 'Hello Fixed 3', drafter_comment: 'Draft 4 Comment' },
            lines: [{ approver_id: 'admin', approver_name: 'Admin' }]
        });

        console.log("=== Final History ===");
        const getRes = await post('get_approvals', { user_id: 'test_user', mode: 'sent' });
        const doc = getRes.list.find(d => d.id === docId);
        console.log(JSON.stringify(doc.content.history, null, 2));

    } catch (e) {
        console.error("Test failed:", e);
    }
}

run();
