const { parentPort, workerData } = require('worker_threads');
const exceljs = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * Worker thread for generating Excel files.
 * Receives { action, data, templatePath, outputPath } from main thread.
 */

async function generateExcel() {
    try {
        const { targetData, docType } = workerData;
        const outputPath = path.join(__dirname, '..', 'downloads', `export_${docType}_${Date.now()}.xlsx`);

        // Check/Create Downloads directory
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const workbook = new exceljs.Workbook();
        const sheet = workbook.addWorksheet(docType);

        parentPort.postMessage({ status: 'processing', progress: 10 });

        // Build Header based on docType
        if (docType === '제정내') {
            sheet.columns = [
                { header: '문서번호', key: 'docNum', width: 20 },
                { header: '제목', key: 'title', width: 40 },
                { header: '발신자', key: 'sender', width: 15 },
                { header: '구분', key: 'target', width: 15 },
                { header: '접수일자', key: 'date', width: 15 }
            ];
        } else if (docType === '제정연') {
            sheet.columns = [
                { header: '문서번호', key: 'docNum', width: 20 },
                { header: '제목', key: 'title', width: 40 },
                { header: '발신자', key: 'sender', width: 15 },
                { header: '수신기관', key: 'target', width: 20 },
                { header: '작성일자', key: 'date', width: 15 },
                { header: '발송완료일', key: 'sentDate', width: 15 }
            ];
        } else if (['성인대장', '자살대장', '아동대장', '퇴원사실통보'].includes(docType)) {
            sheet.columns = [
                { header: '대상자명', key: 'name', width: 15 },
                { header: '연락처', key: 'contact', width: 20 },
                { header: '접수일자', key: 'date', width: 15 },
                { header: '의뢰기관', key: 'agency', width: 30 },
                { header: '담당자', key: 'agencyContact', width: 15 },
                { header: '구분', key: 'category', width: 15 },
                { header: '회신여부', key: 'status', width: 15 }
            ];
        } else if (['강사비산출내역서', '강의확인서', '사례종결보고서-2026년', '응급개입기록지'].includes(docType)) {
            sheet.columns = [
                { header: '문서번호', key: 'docNum', width: 20 },
                { header: '제목', key: 'title', width: 40 },
                { header: '발신자(작성자)', key: 'sender', width: 15 },
                { header: '발송대상(구분)', key: 'target', width: 20 },
                { header: '발급일자', key: 'date', width: 15 }
            ];
        } else { // 제정공
            sheet.columns = [
                { header: '문서번호', key: 'docNum', width: 20 },
                { header: '제목', key: 'title', width: 40 },
                { header: '발신자', key: 'sender', width: 15 },
                { header: '수신자', key: 'target', width: 20 },
                { header: '접수일자', key: 'date', width: 15 },
                { header: '발신완료일', key: 'sentDate', width: 15 }
            ];
        }

        parentPort.postMessage({ status: 'processing', progress: 30 });

        // Add Rows
        sheet.addRows(targetData);

        // Style the Header Row
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        parentPort.postMessage({ status: 'processing', progress: 60 });

        // Save File
        await workbook.xlsx.writeFile(outputPath);

        parentPort.postMessage({ status: 'processing', progress: 100 });

        // Return relative path for client downloading
        parentPort.postMessage({ status: 'done', file: `/downloads/${path.basename(outputPath)}` });

    } catch (error) {
        parentPort.postMessage({ status: 'error', error: error.message });
    }
}

generateExcel();
