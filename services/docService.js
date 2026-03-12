const db = require('../db');

function syncLinkedDocStatus(linkedDocId, newStatus) {
    if (!linkedDocId) return;
    try {
        const prefix = linkedDocId.split('-')[0];
        const prefixMap = {
            'VOU': 'issued_docs_voucher',
            'CNF': 'issued_docs_confirmation',
            'REPC': 'issued_docs_reply_child',
            'REPA': 'issued_docs_reply_adult',
            'REPS': 'issued_docs_reply_suicide',
            'REPR': 'issued_docs_reply_resignation',
            'REP': 'issued_docs_reply_letter', // Legacy support
            'DIS': 'issued_docs_dis',
            'JJY': 'issued_docs_jejungyeon',
            'CAL': 'issued_docs_calc',
            'LCF': 'issued_docs_lecture_conf',
            'RPT': 'issued_docs_report',
            'EMG': 'issued_docs_emergency',
            'BTR': 'issued_docs_biz_trip',
            'CMT': 'issued_docs_case_meeting'
        };

        const targetTable = prefixMap[prefix];
        if (targetTable) {
            db.prepare(`UPDATE ${targetTable} SET status = ? WHERE id = ?`).run(newStatus, linkedDocId);
            console.log(`[Doc Cascade] linked doc ${linkedDocId} updated to ${newStatus} in ${targetTable}`);
        } else {
            console.log(`[Doc Cascade] Unknown prefix ${prefix} for linked doc ${linkedDocId}`);
        }
    } catch (e) {
        console.error('[Doc Cascade Error]', e);
    }
}

module.exports = {
    syncLinkedDocStatus
};
