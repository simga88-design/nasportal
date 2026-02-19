const fs = require('fs');
const path = require('path');

const originalFilePath = process.argv[2] || "n:\\개인\\템플릿\\응급개입 기록지(수정본).html";
const rawHtml = fs.readFileSync(originalFilePath, 'utf8');

// We need to parse all inputs and textareas and give them IDs, and build two files:
// 1. Template file (doc_templates) with spans instead of inputs, and JS postMessage listener
// 2. Form file (doc_forms) with inputs, and JS to send postMessage

let formHtml = rawHtml;
let templateHtml = rawHtml;

let idCounter = 1;

let fields = []; // to generate JS { id, type }

// RegExp to find inputs and textareas
// 1. Checkboxes/radios
// 2. Text inputs
// 3. Textareas

let replaceFnForTemplate = (match, p1) => {
    let id = `auto_${idCounter++}`;
    // simple heuristic:
    if (match.includes('type="checkbox"') || match.includes('type="radio"')) {
        fields.push({ id, type: 'check' });
        return `<span id="t_${id}">☐</span>`;
    } else if (match.includes('<textarea')) {
        let style = "";
        let classMatch = match.match(/class="([^"]+)"/);
        let res = `<div id="v_${id}" class="val-textarea" style="white-space: pre-wrap; min-height: 40px;"></div>`;
        fields.push({ id, type: 'textarea' });
        return res;
    } else {
        // text input
        let styleMatch = match.match(/style="([^"]+)"/);
        let classMatch = match.match(/class="([^"]+)"/);
        let widthStyle = "width: 100%;";
        if (styleMatch) widthStyle = styleMatch[1];
        if (classMatch && classMatch[1].includes('text-input-short')) widthStyle = "width: 50px; text-align: center;";
        fields.push({ id, type: 'text' });
        return `<span id="v_${id}" class="val-text" style="display:inline-block; min-height: 20px; ${widthStyle}"></span>`;
    }
};

let replaceFnForForm = (match, p1) => {
    const field = fields[idCounter - 1]; // using same global state assumption, wait...
    return match; // We actually need to inject ID to Form HTML, and name for radios/checkboxes if grouped, but original has none.
};

function processHtml() {
    let internalCounter = 1;
    let localFields = [];

    // Replace <input...>, <textarea...></textarea>
    // Note: This regex is very simplistic but sufficient for our template
    let newTemplate = templateHtml.replace(/<input[^>]*>/g, (match) => {
        let id = `f_${internalCounter++}`;
        if (match.includes('type="checkbox"') || match.includes('type="radio"')) {
            localFields.push({ id, type: 'check', original: match });
            return `<span id="t_${id}">☐</span>`;
        } else {
            let widthStyle = "";
            let styleMatch = match.match(/style="([^"]+)"/);
            if (styleMatch && styleMatch[1].includes("width")) {
                let w = styleMatch[1].match(/width:\s*([^;"]+)/);
                if (w) widthStyle = `width: ${w[1]};`;
            }
            if (match.includes('text-input-short')) widthStyle = "width: 60px; text-align: center;";
            localFields.push({ id, type: 'text', original: match });
            return `<span id="v_${id}" class="val-text" style="display:inline-block; min-height: 20px; border-bottom: 1px solid #ccc; ${widthStyle}"></span>`;
        }
    }).replace(/<textarea[^>]*>[\s\S]*?<\/textarea>/g, (match) => {
        let id = `f_${internalCounter++}`;
        localFields.push({ id, type: 'textarea', original: match });
        return `<div id="v_${id}" class="val-textarea" style="white-space: pre-wrap; min-height: 40px;"></div>`;
    });

    internalCounter = 1;
    let newForm = formHtml.replace(/<input[^>]*>/g, (match) => {
        let id = `f_${internalCounter++}`;
        // replace <input ...> with <input id="...">
        return match.replace('<input', `<input id="${id}"`);
    }).replace(/<textarea([^>]*)>[\s\S]*?<\/textarea>/g, (match, p1) => {
        let id = `f_${internalCounter++}`;
        return `<textarea id="${id}"${p1}></textarea>`;
    });

    return { newTemplate, newForm, localFields };
}

const { newTemplate, newForm, localFields } = processHtml();

// GENERATE TEMPLATE JS
let templateJs = `
    <script>
        window.addEventListener('message', function (event) {
            const data = event.data;
            if (data.type === 'updatePreview' || data.action === 'updatePreview') {
                const payload = data.payload || {};
${localFields.map(f => {
    if (f.type === 'check') return `                document.getElementById('t_${f.id}').innerText = payload.${f.id} ? '☑' : '☐';`;
    if (f.type === 'text' || f.type === 'textarea') return `                if(document.getElementById('v_${f.id}')) document.getElementById('v_${f.id}').innerText = payload.${f.id} || '';`;
    return '';
}).join('\n')}
            } else if (data.action === 'print') {
                window.print();
            }
        });
    </script>
</body>
`;

// GENERATE FORM JS
let formJs = `
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">
    <script src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
    <script>
        const API_URL = \`\${(typeof window !== 'undefined' ? window.location.origin : 'http://localhost')}/api/auth\`;

        function getPayload() {
            return {
${localFields.map(f => {
    if (f.type === 'check') return `                ${f.id}: document.getElementById('${f.id}').checked,`;
    if (f.type === 'text' || f.type === 'textarea') return `                ${f.id}: document.getElementById('${f.id}').value,`;
    return '';
}).join('\n')}
            };
        }

        function triggerPreview() {
            if (window.updateTimeout) clearTimeout(window.updateTimeout);
            window.updateTimeout = setTimeout(() => {
                window.parent.postMessage({ type: 'updatePreview', payload: getPayload() }, '*');
            }, 100);
        }

        document.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('input', triggerPreview);
            el.addEventListener('change', triggerPreview);
        });

        window.addEventListener('message', function (event) {
            if (event.data.action === 'save') {
                saveData(event.data.commonData);
            } else if (event.data.action === 'updateCommon') {
                // optional mapping, skipping for generality
                triggerPreview();
            } else if (event.data.action === 'unlockInputs') {
                document.querySelectorAll('input, select, textarea').forEach(el => el.disabled = false);
            } else if (event.data.action === 'loadDoc') {
                const doc = event.data.data;
                const content = doc.content || {};

${localFields.map(f => {
    if (f.type === 'check') return `                document.getElementById('${f.id}').checked = !!content.${f.id};`;
    if (f.type === 'text' || f.type === 'textarea') return `                document.getElementById('${f.id}').value = content.${f.id} || '';`;
    return '';
}).join('\n')}
                document.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
                triggerPreview();
            }
        });

        function saveData(commonData) {
            const content = getPayload();
            // Assuming f_3 is name based on structure, let's find the first text input
            const target_name = content.f_3 || '이름없음'; 

            fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_issued_doc',
                    type: '응급개입 기록지(수정본)',
                    target_name: target_name,
                    title: \`응급개입기록지(\${target_name})\`,
                    content: { ...commonData, ...content },
                    issuer: commonData.issuer
                })
            })
                .then(res => res.json())
                .then(json => {
                    if (json.result === 'success') {
                        window.parent.postMessage({ type: 'saveSuccess', id: json.id }, '*');
                    } else {
                        Toastify({ text: "오류 발생: " + json.message, style: { background: "#ef4444" }, duration: 4000 }).showToast();
                        window.parent.postMessage({ type: 'saveError' }, '*');
                    }
                })
                .catch(err => {
                    Toastify({ text: "서버 오류", style: { background: "#ef4444" }, duration: 4000 }).showToast();
                    window.parent.postMessage({ type: 'saveError' }, '*');
                });
        }
        
        // init
        document.addEventListener('DOMContentLoaded', () => {
            triggerPreview();
        });
    </script>
</body>
`;

// Insert scripts before </body>
const outTemplate = newTemplate.replace(/<\/body>\s*<\/html>/, templateJs + "\n</html>")
    // Add watermark
    .replace('<body>', '<body>\n    <img id="watermark" src="../doc_forms/로고.png" alt="워터마크" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; opacity: 0.1; z-index: -1; pointer-events: none;">\n');
const outForm = newForm.replace(/<\/body>\s*<\/html>/, formJs + "\n</html>");

fs.writeFileSync('c:\\Users\\SKH\\Desktop\\pcserver\\apps\\doc_templates\\응급개입 기록지(수정본).html', outTemplate);
fs.writeFileSync('c:\\Users\\SKH\\Desktop\\pcserver\\apps\\doc_forms\\응급개입 기록지(수정본).html', outForm);

console.log("Success! Extracted " + localFields.length + " fields.");
