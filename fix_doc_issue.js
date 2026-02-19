const fs = require('fs');
const iconv = require('iconv-lite');
const file = 'c:/Users/SKH/Desktop/pcserver/apps/doc_issue.html';
const rawBuffer = fs.readFileSync(file);
let isCp949 = false;

// Decode as UTF-8 first
let content = iconv.decode(rawBuffer, 'utf-8');

// If '문서' is garbled, try cp949
if (content.includes('\u5310\u613C\uA714\u0020\u8AAB\u7153\uC288') || content.includes('\u5310\u613C\uA714')) {
    content = iconv.decode(rawBuffer, 'cp949');
    isCp949 = true;
} else if (!content.includes('문서')) {
    content = iconv.decode(rawBuffer, 'cp949');
    isCp949 = true;
}

// 1. Toastify Replace
content = content.replace(/backgroundColor:\s*['"](#[0-9a-fA-F]+)['"]/g, 'style: { background: "$1" }');

// 2. loadHistoryDetail Replace
const oldFn = /function loadHistoryDetail\(id\) \{[\s\S]*?\}/;
const newFn = `function loadHistoryDetail(id) {
            Toastify({ text: "기존 문서를 불러옵니다...", style: { background: "#3b82f6" }, duration: 2000 }).showToast();
            fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_issued_doc', id: id })
            })
            .then(res => res.json())
            .then(data => {
                if (data.result === 'success' && data.data) {
                    const doc = data.data;
                    const docTypeMapping = {
                        'voucher': 'voucher',
                        '의뢰서': 'voucher',
                        'confirmation': 'confirmation',
                        '상담확인서': 'confirmation',
                        'reply_letter': 'reply_letter',
                        '의뢰회신서': 'reply_letter'
                    };
                    const mappedType = docTypeMapping[doc.type] || docTypeMapping[doc.doc_type] || 'voucher';
                    
                    if (currentMode !== mappedType) {
                        document.getElementById('docTypeSelect').value = mappedType;
                        switchDocType(mappedType);
                        
                        const formIframe = document.getElementById('form-frame');
                        formIframe.onload = function() {
                            sendCommonDataToForm();
                            setTimeout(() => {
                                formIframe.contentWindow.postMessage({ action: 'loadDoc', data: doc }, '*');
                            }, 300);
                        };
                    } else {
                        const formIframe = document.getElementById('form-frame');
                        if (formIframe && formIframe.contentWindow) {
                            formIframe.contentWindow.postMessage({ action: 'loadDoc', data: doc }, '*');
                        }
                    }
                    toggleDrawer();
                } else {
                    Toastify({ text: "문서를 찾을 수 없습니다.", style: { background: "#ef4444" }, duration: 3000 }).showToast();
                }
            })
            .catch(err => {
                Toastify({ text: "서버 오류발생", style: { background: "#ef4444" }, duration: 3000 }).showToast();
            });
        }`;

content = content.replace(oldFn, newFn);

// Always write as UTF-8 so cortex can read it safely later
fs.writeFileSync(file, iconv.encode(content, 'utf-8'));
console.log('Successfully updated JS logic and converted to UTF-8 in doc_issue.html!');
