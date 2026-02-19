
export const DOC_DEFINITIONS = {
    voucher: {
        id: "voucher",
        name: "마음투자 의뢰서",
        templateUrl: "./doc_issue/templates/voucher.html",
        fields: [
            // Row 1
            { id: "v_name", label: "성명", type: "text", width: "half" },
            { id: "v_birth", label: "생년월일 (6자리)", type: "text", width: "half", placeholder: "예: 900101" },
            // Row 2
            { id: "v_gender", label: "성별", type: "select", width: "half", options: ["남성", "여성"] },
            { id: "v_contact", label: "연락처", type: "text", width: "half" },
            // Row 3
            { id: "v_address", label: "주소", type: "text", width: "full" },
            // Separator
            { type: "separator" },
            // Main Issue
            {
                id: "v_mainIssue", label: "주호소 문제", type: "checkbox_group",
                options: ["우울", "불안"],
                hasOther: true, otherLabel: "기타", otherPlaceholder: "기타 내용"
            },
            // Psy Test
            {
                id: "v_psyTest", label: "심리검사 결과", type: "custom_scores",
                items: [
                    { id: "v_chk_phq9", label: "PHQ-9", scoreId: "v_score_phq9" },
                    { id: "v_chk_gad7", label: "GAD-7", scoreId: "v_score_gad7" }
                ]
            },
            // Medication
            { id: "v_medication", label: "약물치료 여부", type: "select", options: ["없음", "있음"], width: "full" },
            // Content
            {
                id: "v_content", label: "의뢰 내용", type: "textarea", rows: 5,
                placeholder: "자동 생성 텍스트가 입력됩니다.",
                hasAutoBtn: true, autoBtnLabel: "내용 자동 생성"
            }
        ],
        // Map Form Field ID -> Template Element ID
        mapping: {
            "v_name": "fld_name",
            "v_gender": "fld_gender",
            "v_birth": "fld_birth",
            "v_contact": "fld_contact",
            "v_address": "fld_address",
            "v_content": "fld_content",
            "issuer": "fld_staffName",
            "issueDate": { target: "fld_issueDate", transform: "date_ko" }
        },
        // Custom Logic for Preview Updates that are too complex for direct mapping
        onUpdate: (data, docId) => {
            // Main Issue HTML
            let issueHtml = '';
            const issues = data.v_mainIssue || [];
            ['우울', '불안'].forEach(k => {
                issueHtml += `<span style="padding-right:20px;">${issues.includes(k) ? '☑' : '☐'} ${k}</span>`;
            });
            const isOther = issues.some(i => i.startsWith('기타'));
            const otherText = data.v_mainIssue_other || ''; // Handled by engine
            issueHtml += `<span>${isOther ? '☑' : '☐'} 기타(${otherText || '___'})</span>`;
            document.getElementById('fld_mainIssue').innerHTML = issueHtml;

            // Psy Test HTML
            let testHtml = `<div><span style="display:inline-block; width: 50%;">${data.v_chk_phq9 ? '☑' : '☐'} PHQ-9: ${data.v_score_phq9 || '___'}점</span>`;
            testHtml += `<span>${data.v_chk_gad7 ? '☑' : '☐'} GAD-7: ${data.v_score_gad7 || '___'}점</span></div>`;
            document.getElementById('fld_psyTest').innerHTML = testHtml;

            // Medication HTML
            const med = data.v_medication;
            document.getElementById('fld_medication').innerHTML =
                `<span>${med === '있음' ? '☑' : '☐'} 있음</span><span style="padding-left: 50px;">${med === '없음' ? '☑' : '☐'} 없음</span>`;

            // Text for IDs
            document.getElementById('v_doc_id').innerText = docId || 'PREVIEW-MODE';
        },
        // Custom Generator Logic
        generateContent: (data) => {
            const phq = data.v_chk_phq9 ? `PHQ-9 ${data.v_score_phq9}점` : '';
            const gad = data.v_chk_gad7 ? `GAD-7 ${data.v_score_gad7}점` : '';
            const issues = [...(data.v_mainIssue || [])];
            if (data.v_mainIssue_other) issues.push(`기타(${data.v_mainIssue_other})`);

            let text = `상기 의뢰인은 본 센터에서 ${issues.join(', ') || '상담'} 문제로 면담을 진행하였고, `;
            text += [phq, gad].filter(x => x).join(', ');
            text += (phq || gad) ? ' 확인됨.' : '';
            text += ' 이에 심리상담이 필요할 것으로 판단되어 의뢰서를 발급함.';
            return text;
        }
    },
    confirmation: {
        id: "confirmation",
        name: "상담확인서",
        templateUrl: "./doc_issue/templates/confirmation.html",
        fields: [
            { id: "c_start", label: "상담 시작일", type: "date", width: "half" },
            { id: "c_end", label: "상담 종료일", type: "date", width: "half" },
            { id: "c_type", label: "상담 형태", type: "text", width: "full", placeholder: "예: 내소상담 (총 5회)" },
            { type: "separator" },
            { id: "c_name", label: "이름", type: "text", width: "half" },
            { id: "c_contact", label: "연락처", type: "text", width: "half" },
            { id: "c_address", label: "주소", type: "text", width: "full" },
            { id: "c_content", label: "상담 내용", type: "textarea", rows: 5 },
            { id: "c_purpose", label: "제출 용도", type: "text", width: "full", value: "기관 제출용" },
            { id: "c_staffTitle", label: "담당자 직책", type: "text", width: "full", value: "주임" }
        ],
        mapping: {
            "c_type": "fld_type",
            "c_name": "fld_c_name",
            "c_contact": "fld_c_contact",
            "c_address": "fld_c_address",
            "c_content": "fld_c_content",
            "c_purpose": "fld_purpose",
            "c_staffTitle": "fld_staffTitle",
            "issuer": "fld_staffName",
            "issueDate": { target: "fld_issueDateText", transform: "date_ko" }
        },
        onUpdate: (data, docId) => {
            const d1 = formatDateSimple(data.c_start);
            const d2 = formatDateSimple(data.c_end);
            const periodEl = document.getElementById('fld_period');
            if (periodEl) periodEl.innerText = `${d1} ~ ${d2}`;

            document.getElementById('c_doc_id').innerText = docId || 'PREVIEW-MODE';
        }
    }
};

// Helpers for definitions
function formatDateSimple(str) {
    if (!str) return '____년 __월 __일';
    const d = new Date(str);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
