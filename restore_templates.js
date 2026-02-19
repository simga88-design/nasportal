const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const historyDir = 'C:/Users/SKH/AppData/Roaming/Code/User/History';
const targetDir = 'C:/Users/SKH/Desktop/pcserver/apps';

function isCorrupt(text) {
    // If it's decoding cp949 as utf8, it becomes replacement chars (EF BF BD).
    return text.includes('\uFFFD') || text.includes('??????') || text.includes('?곷떞') || text.includes('?쒗뵆');
}

function findValidBackup(filename) {
    if (!fs.existsSync(historyDir)) return null;
    const dirs = fs.readdirSync(historyDir);
    let bestFile = null;
    let latestTime = 0;

    for (const d of dirs) {
        const dPath = path.join(historyDir, d);
        if (!fs.statSync(dPath).isDirectory()) continue;
        const entriesFile = path.join(dPath, 'entries.json');
        if (!fs.existsSync(entriesFile)) continue;

        try {
            const data = JSON.parse(fs.readFileSync(entriesFile, 'utf8'));
            if (data.resource && data.resource.endsWith(filename)) {
                if (!data.entries) continue;
                // scan entries from newest to oldest
                for (let i = data.entries.length - 1; i >= 0; i--) {
                    const entryFile = path.join(dPath, data.entries[i].id);
                    if (!fs.existsSync(entryFile)) continue;

                    const raw = fs.readFileSync(entryFile);
                    let txtStr = iconv.decode(raw, 'utf8');
                    let isCp949 = false;

                    if (isCorrupt(txtStr)) {
                        txtStr = iconv.decode(raw, 'cp949');
                        isCp949 = true;
                    }

                    if (!isCorrupt(txtStr) && txtStr.includes('<html')) {
                        const mtime = fs.statSync(entryFile).mtimeMs;
                        if (mtime > latestTime) {
                            latestTime = mtime;
                            bestFile = { file: entryFile, content: txtStr, mtime };
                        }
                    }
                }
            }
        } catch (e) { }
    }
    return bestFile;
}

const files = [
    'doc_forms/confirmation.html',
    'doc_forms/reply_letter.html',
    'doc_templates/confirmation.html',
    'doc_templates/reply_letter.html',
    'doc_forms/voucher.html',
    'doc_templates/voucher.html'
];

files.forEach(f => {
    const filename = path.basename(f);
    const backup = findValidBackup(filename);
    if (backup) {
        console.log(`Restoring ${f} from ${backup.file} (Time: ${new Date(backup.mtime).toLocaleString()})`);
        fs.writeFileSync(path.join(targetDir, f), iconv.encode(backup.content, 'utf8'));
    } else {
        console.log(`No valid backup found for ${f}`);
    }
});
