const fs = require('fs');
const iconv = require('iconv-lite');
try {
    const raw = fs.readFileSync('c:/Users/SKH/Desktop/pcserver/apps/reply_letter.html');
    let utf8 = iconv.decode(raw, 'cp949');
    fs.writeFileSync('c:/Users/SKH/Desktop/pcserver/apps/reply_letter_utf8.html', iconv.encode(utf8, 'utf-8'));
    console.log('Converted reply_letter.html to UTF-8 successfully');
} catch (e) { console.error('Error:', e.message); }
