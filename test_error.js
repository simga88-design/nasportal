const http = require('http');

const postData = JSON.stringify({
    action: 'save_error_report',
    author_id: 'test_user',
    author_name: '테스터',
    title: '테스트 오류 신고',
    content: '이 글은 테스트 신고입니다.'
});

const req = http.request({
    hostname: 'localhost',
    port: 3000, // Assuming 3000, I'll check server.js
    path: '/api/auth',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Response:', data);
        
        // Check DB
        const db = require('./db.js');
        const report = db.prepare('SELECT * FROM error_reports ORDER BY created_at DESC LIMIT 1').get();
        console.log('Inserted report:', report);
        
        const noti = db.prepare("SELECT * FROM notifications WHERE type='ERROR_REPORT' ORDER BY created_at DESC LIMIT 1").get();
        console.log('Notification:', noti);
    });
});

req.on('error', (e) => {
    console.error(`Problem: ${e.message}`);
});
req.write(postData);
req.end();
