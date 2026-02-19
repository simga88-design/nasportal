const http = require('http');

const postData = JSON.stringify({
    action: 'save_error_report',
    author_id: 'test_user2',
    author_name: '테스터2',
    category: '기능 오류',
    urgency: '높음',
    title: '새로운 테스트 오류 신고',
    content: '이 글은 개선된 폼의 테스트 신고입니다.',
    attachments: ['error_reports/1234_test.png']
});

const submitReq = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
}, (res2) => {
    let data2 = '';
    res2.on('data', chunk => data2 += chunk);
    res2.on('end', () => {
        console.log('Submit Result:', data2);
        
        // Check DB
        const db = require('./db.js');
        const report = db.prepare('SELECT * FROM error_reports ORDER BY created_at DESC LIMIT 1').get();
        console.log('Inserted report:', report);
        
        const noti = db.prepare("SELECT * FROM notifications WHERE type='ERROR_REPORT' ORDER BY created_at DESC LIMIT 1").get();
        console.log('Notification:', noti);
    });
});
submitReq.on('error', console.error);
submitReq.write(postData);
submitReq.end();
