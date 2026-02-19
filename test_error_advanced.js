const fs = require('fs');
const http = require('http');
const FormData = require('form-data');

// 1. Create a dummy image file
const dummyPath = './dummy.png';
fs.writeFileSync(dummyPath, Buffer.from('dummy image content'));

const form = new FormData();
form.append('attachments', fs.createReadStream(dummyPath));

// 2. Upload file
const uploadReq = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/upload_error_report',
    method: 'POST',
    headers: form.getHeaders()
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Upload Result:', data);
        const uJson = JSON.parse(data);
        
        if(uJson.result === 'success') {
            // 3. Submit data
            const postData = JSON.stringify({
                action: 'save_error_report',
                author_id: 'test_user2',
                author_name: '테스터2',
                category: '화면 깨짐',
                urgency: '긴급',
                title: '버튼 겹침 현상',
                content: '모바일에서 버튼이 겹칩니다.',
                attachments: uJson.attachments
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
                    
                    // Cleanup dummy
                    fs.unlinkSync(dummyPath);

                    // Check DB
                    const db = require('./db.js');
                    const report = db.prepare('SELECT * FROM error_reports ORDER BY created_at DESC LIMIT 1').get();
                    console.log('Inserted report:', report);
                    
                    const noti = db.prepare("SELECT * FROM notifications WHERE type='ERROR_REPORT' ORDER BY created_at DESC LIMIT 1").get();
                    console.log('Notification:', noti);
                });
            });
            submitReq.write(postData);
            submitReq.end();
        }
    });
});
form.pipe(uploadReq);
