const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads');
const xlsx = require('xlsx');

const eventBus = require('./events/eventBus');
require('./events/subscribers');

const app = express();
const port = 80;

// High-Priority Logging Middleware
app.use((req, res, next) => {
    const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.url} - Content-Type: ${req.headers['content-type']}\n`;
    console.log(logMsg.trim());
    try {
        fs.appendFileSync(path.join(__dirname, 'debug.log'), logMsg);
    } catch (e) { }
    next();
});

// Middleware
app.use(cors());
app.use(express.static(__dirname)); // Serve static files from root
app.use('/downloads', express.static(path.join(__dirname, 'downloads'))); // Serve dynamically generated excel files
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.text({ type: ['text/plain', 'text/plain;charset=utf-8', 'text/*'], limit: '50mb' }));

const multer = require('multer');
// [TEST] 테스트를 위해 Z 드라이브 대신 로컬 서버 폴더를 사용합니다.
// 실제 운영(배포) 시 주석 처리된 기존 Z 드라이브 경로로 복구하세요.
// const NAS_CIRCULATION_PATH = "z:\\public\\공람파일저장함\\";
const NAS_CIRCULATION_PATH = path.join(__dirname, 'uploads', 'circulation');

try {
    if (!fs.existsSync(NAS_CIRCULATION_PATH)) fs.mkdirSync(NAS_CIRCULATION_PATH, { recursive: true });
    if (!fs.existsSync(path.join(NAS_CIRCULATION_PATH, 'attachments'))) fs.mkdirSync(path.join(NAS_CIRCULATION_PATH, 'attachments'), { recursive: true });
} catch (e) {
    console.log("NAS PATH INIT ERROR (ignored):", e.message);
}

const circStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'mainFile') {
            cb(null, NAS_CIRCULATION_PATH);
        } else {
            const docId = req.body.docId || ('temp_' + Date.now());
            const attachDir = path.join(NAS_CIRCULATION_PATH, 'attachments', docId);
            if (!fs.existsSync(attachDir)) fs.mkdirSync(attachDir, { recursive: true });
            cb(null, attachDir);
        }
    },
    filename: function (req, file, cb) {
        // Multer handles filenames with latin1 by default, requiring conversion for Korean chars
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const safeName = `${Date.now()}_${originalName.replace(/\\s/g, '_')}`;
        cb(null, safeName);
    }
});
const uploadCirc = multer({ storage: circStorage });

app.post('/api/upload_circ', uploadCirc.fields([{ name: 'mainFile', maxCount: 1 }, { name: 'attachments' }]), (req, res) => {
    try {
        const mainFile = req.files['mainFile'] ? req.files['mainFile'][0].filename : null;
        const attachments = req.files['attachments'] ? req.files['attachments'].map(f => f.filename) : [];
        res.json({ result: 'success', mainFile, attachments });
    } catch (e) {
        res.json({ result: 'error', message: e.message });
    }
});

app.get('/api/download_circ', (req, res) => {
    try {
        const fileParam = req.query.file;
        if (!fileParam || fileParam.includes('..')) return res.status(400).send('Invalid file path');

        const fullPath = path.join(NAS_CIRCULATION_PATH, fileParam);
        if (fs.existsSync(fullPath)) {
            const ext = path.extname(fullPath).toLowerCase();
            const safeName = encodeURIComponent(path.basename(fullPath));

            if (ext === '.pdf') {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'inline; filename="' + safeName + '"');
            } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
                res.setHeader('Content-Disposition', 'inline; filename="' + safeName + '"');
            } else {
                res.setHeader('Content-Disposition', 'attachment; filename="' + safeName + '"');
            }
            res.sendFile(fullPath);
        } else {
            res.status(404).send('File not found: ' + fullPath);
        }
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// --- Approval File Upload Logic ---
const NAS_APPROVAL_PATH = path.join(__dirname, 'uploads', 'approval');
try {
    if (!fs.existsSync(NAS_APPROVAL_PATH)) fs.mkdirSync(NAS_APPROVAL_PATH, { recursive: true });
} catch (e) {
    console.log("NAS APPROVAL PATH INIT ERROR (ignored):", e.message);
}

const approvalStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const docId = req.body.docId || ('temp_' + Date.now());
        const attachDir = path.join(NAS_APPROVAL_PATH, docId);
        if (!fs.existsSync(attachDir)) fs.mkdirSync(attachDir, { recursive: true });
        cb(null, attachDir);
    },
    filename: function (req, file, cb) {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const safeName = `${Date.now()}_${originalName.replace(/\\s/g, '_')}`;
        cb(null, safeName);
    }
});
const uploadApproval = multer({ storage: approvalStorage });

app.post('/api/upload_approval', uploadApproval.array('attachments'), (req, res) => {
    try {
        const attachments = req.files ? req.files.map(f => f.filename) : [];
        res.json({ result: 'success', attachments });
    } catch (e) {
        res.json({ result: 'error', message: e.message });
    }
});

// --- Error Report Upload ---
const errorStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const attachDir = path.join(NAS_BASE, 'error_reports');
        if (!fs.existsSync(attachDir)) fs.mkdirSync(attachDir, { recursive: true });
        cb(null, attachDir);
    },
    filename: function (req, file, cb) {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const safeName = `${Date.now()}_${originalName.replace(/\\s/g, '_')}`;
        cb(null, safeName);
    }
});
const uploadError = multer({ storage: errorStorage });

app.post('/api/upload_error_report', uploadError.array('attachments'), (req, res) => {
    try {
        // Return relative path like "error_reports/filename.png"
        const attachments = req.files ? req.files.map(f => `error_reports/${f.filename}`) : [];
        res.json({ result: 'success', attachments });
    } catch (e) {
        res.json({ result: 'error', message: e.message });
    }
});

app.get('/api/download_approval', (req, res) => {
    try {
        const fileParam = req.query.file;
        if (!fileParam || fileParam.includes('..')) return res.status(400).send('Invalid file path');

        const fullPath = path.join(NAS_APPROVAL_PATH, fileParam);
        if (fs.existsSync(fullPath)) {
            const ext = path.extname(fullPath).toLowerCase();
            const safeName = encodeURIComponent(path.basename(fullPath));

            if (ext === '.pdf') {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'inline; filename="' + safeName + '"');
            } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
                res.setHeader('Content-Disposition', 'inline; filename="' + safeName + '"');
            } else {
                res.setHeader('Content-Disposition', 'attachment; filename="' + safeName + '"');
            }
            res.sendFile(fullPath);
        } else {
            res.status(404).send('File not found: ' + fullPath);
        }
    } catch (e) {
        res.status(500).send(e.message);
    }
});


app.use((req, res, next) => {
    // If body is a string (from express.text), attempt to parse as JSON
    if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
        try {
            req.body = JSON.parse(req.body);
        } catch (e) {
            console.error('[Middleware] JSON Parse Error:', e.message);
        }
    }

    // Log action if possible
    if (req.method === 'POST') {
        const body = req.body || {};
        const action = typeof body === 'object' ? body.action : 'none';
        console.log(`[${new Date().toISOString()}] API Action: ${action}`);
    }
    next();
});

// Database setup
const db = require('./db');

// --- Control Tower: Notification Helper ---
function sendInternalNotification(user_id, type, title, message, link) {
    try {
        const id = `NOTI_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(id, user_id, type, title, message, link || '');
        console.log(`[Notification] Sent to ${user_id}: ${title}`);
    } catch (e) {
        console.error('[Notification Error]', e);
    }
}

// Helper for safe JSON parsing
function safeParse(str, fallback = []) {
    try {
        if (!str) return fallback;
        if (typeof str === 'object') return str;
        return JSON.parse(str);
    } catch (e) {
        return fallback;
    }
}

const INQUIRY_COLUMNS = [
    'category', 'date', 'name', 'birth', 'gender', 'address', 'contact',
    'agencyType', 'agencyDetail', 'agencyContact', 'reqType', 'reqReason',
    'childClass', 'disease', 'notifyDate', 'agencyLoc', 'status', 'replyDate',
    'staffName', 'processContent', 'counselingContent', 'actionResult',
    'futurePlan', 'serviceMethod', 'progressStatus', 'docNum', 'provideDate', 'issuedDocId',
    'admissionDate', 'dischargeDate'
];

// API Endpoints
app.post('/api/auth', (req, res) => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.json({ result: 'error', message: 'Invalid or missing request body' });
        }

        const { action } = req.body;
        if (!action) return res.json({ result: 'error', message: 'No action provided' });

        // --- Authentication Actions ---
        if (action === 'login') {
            const { id, password } = req.body;
            const user = db.prepare('SELECT * FROM members WHERE id = ? AND password = ?').get(id, password);
            if (user) {
                user.isSystemAdmin = !!user.isSystemAdmin;
                user.isCirculationAdmin = !!user.isCirculationAdmin;
                res.json({ result: 'success', user });
            } else {
                res.json({ result: 'error', message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
            }
        } else if (action === 'check_version') {
            const { currentVersion } = req.body;
            res.json({ result: 'success', isOutdated: false, latestVersion: currentVersion });
        } else if (action === 'get_members') {
            const list = db.prepare('SELECT * FROM members').all();
            res.json({ result: 'success', list });
        } else if (action === 'save_member') {
            const { id, password, name, email, role, team, position, phone, stamp, status, isSystemAdmin, isCirculationAdmin, joinDate } = req.body;
            // Admin form doesn't send 'avatar'. Omit avatar from the UPDATE block so user profile pictures are not wiped.
            // Default it to '' only on INSERT.
            const stmt = db.prepare(`
                INSERT INTO members (id, password, name, email, role, team, position, phone, avatar, stamp, status, isSystemAdmin, isCirculationAdmin, joinDate) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    password=excluded.password,
                    name=excluded.name,
                    email=excluded.email,
                    role=excluded.role,
                    team=excluded.team,
                    position=excluded.position,
                    phone=excluded.phone,
                    stamp=excluded.stamp,
                    status=excluded.status,
                    isSystemAdmin=excluded.isSystemAdmin,
                    isCirculationAdmin=excluded.isCirculationAdmin,
                    joinDate=excluded.joinDate
            `);
            stmt.run(id, password, name, email, role, team, position || '', phone || '', stamp || '', status, isSystemAdmin ? 1 : 0, isCirculationAdmin ? 1 : 0, joinDate || '');
            res.json({ result: 'success' });
        } else if (action === 'delete_member') {
            db.prepare('DELETE FROM members WHERE id = ?').run(req.body.id);
            res.json({ result: 'success' });
        } else if (action === 'get_teams') {
            const list = db.prepare('SELECT * FROM teams').all();
            res.json({ result: 'success', list });
        } else if (action === 'save_team') {
            const { code, name, leader, description } = req.body;
            const stmt = db.prepare(`INSERT OR REPLACE INTO teams (code, name, leader, description) VALUES (?, ?, ?, ?)`);
            stmt.run(code, name, leader, description);
            res.json({ result: 'success' });
        } else if (action === 'delete_team') {
            db.prepare('DELETE FROM teams WHERE code = ?').run(req.body.code);
            res.json({ result: 'success' });
        } else if (action === 'update_profile') {
            const { id, password, phone, avatar, stamp } = req.body;
            // The self-edit form doesn't control role, position, or team. Omitting them prevents overwriting existing MDM HR data.
            const stmt = db.prepare(`UPDATE members SET password = ?, phone = ?, avatar = ?, stamp = ? WHERE id = ?`);
            stmt.run(password, phone, avatar || '', stamp || '', id);
            // Fetch updated user to return
            const user = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
            if (user) user.isSystemAdmin = !!user.isSystemAdmin;
            res.json({ result: 'success', user });
        }

        // --- Notice Actions ---
        else if (action === 'get_notices') {
            const list = db.prepare('SELECT * FROM notices ORDER BY isPinned DESC, date DESC').all();
            const enriched = list.map(n => ({ ...n, files: n.files ? JSON.parse(n.files) : [] }));
            res.json({ result: 'success', list: enriched });
        } else if (action === 'save_notice') {
            const { id, type, title, content, isPinned, author, date, files } = req.body;
            // Using KST date
            const kstDate = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const finalDate = date || kstDate;
            const pinnedVal = isPinned ? 1 : 0;
            const filesStr = files ? JSON.stringify(files) : '[]';
            
            console.log(`[save_notice] type=${type}, isPinned=${isPinned}, files_count=${files ? files.length : 'null'}, filesStr_len=${filesStr.length}`);

            if (id) {
                // Update existing notice, preserve viewCount
                const stmt = db.prepare(`UPDATE notices SET type=?, title=?, content=?, isPinned=?, author=?, date=?, files=? WHERE id=?`);
                stmt.run(type, title, content, pinnedVal, author, finalDate, filesStr, id);
            } else {
                // Insert new notice
                const newId = `N_${Date.now()}`;
                const stmt = db.prepare(`INSERT INTO notices (id, type, title, content, isPinned, author, date, viewCount, files) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`);
                stmt.run(newId, type, title, content, pinnedVal, author, finalDate, filesStr);
            }

            // --- Notification Logic ---
            // 전사 공지사항일 경우 알림 전송 (신규 등록 시)
            if (!id && ['공지', '긴급', '행사'].includes(type)) {
                const activeMembers = db.prepare("SELECT id, name FROM members WHERE status != '퇴사' AND status != '휴직' AND status != 'Inactive'").all();

                let notiType = 'BOARD';
                let titlePrefix = '[공지]';
                let messageBody = `[${type}] ${author}님이 새 공지사항을 등록했습니다.`;

                if (type === '긴급') {
                    notiType = 'URGENT';
                    titlePrefix = '🚨 [긴급공지]';
                    messageBody = `🚨 [긴급] ${author}님이 긴급 공지사항을 등록했습니다. 필독 바랍니다.`;
                } else if (type === '행사') {
                    titlePrefix = '🎉 [행사안내]';
                }

                let activeUsers = activeMembers.filter(m => m.name !== author && m.id !== author).map(m => m.id);
                eventBus.emit('notice:created', {
                    author,
                    type,
                    titlePrefix,
                    messageBody,
                    userIds: activeUsers,
                    notiType
                });
            }
            res.json({ result: 'success' });
        } else if (action === 'delete_notice') {
            db.prepare('DELETE FROM notices WHERE id = ?').run(req.body.id);
            res.json({ result: 'success' });
        } else if (action === 'increment_notice_view') {
            db.prepare('UPDATE notices SET viewCount = COALESCE(viewCount, 0) + 1 WHERE id = ?').run(req.body.id);
            res.json({ result: 'success' });
        }

        // --- Calendar Actions ---
        else if (action === 'get_events') {
            const list = db.prepare('SELECT * FROM events').all();
            const parsedList = list.map(ev => ({ ...ev, raw: safeParse(ev.raw, {}) }));
            res.json({ result: 'success', list: parsedList });
        } else if (action === 'save_event') {
            const { id, title, start, end, isAllday, category, location, body, calendarId, state, raw, groupId, rrule } = req.body;
            const stmt = db.prepare(`INSERT OR REPLACE INTO events (id, title, start, end, isAllday, category, location, body, calendarId, state, raw, groupId, rrule) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            stmt.run(id || `E_${Date.now()}`, title, start, end, isAllday ? 1 : 0, category, location || '', body || '', calendarId, state || '', JSON.stringify(raw || {}), groupId || null, rrule || null);
            res.json({ result: 'success' });
        } else if (action === 'delete_event') {
            db.prepare('DELETE FROM events WHERE id = ?').run(req.body.id);
            res.json({ result: 'success' });
        }

        // --- Saved Lines Actions ---
        else if (action === 'get_saved_lines') {
            const list = db.prepare('SELECT * FROM saved_lines WHERE user_id = ? ORDER BY created_at DESC').all(req.body.user_id);
            const parsed = list.map(l => ({ ...l, lines: safeParse(l.lines) }));
            res.json({ result: 'success', list: parsed });
        } else if (action === 'save_line') {
            const { user_id, title, lines } = req.body;
            const id = `SL_${Date.now()}`;
            db.prepare('INSERT INTO saved_lines (id, user_id, title, lines) VALUES (?, ?, ?, ?)').run(id, user_id, title, JSON.stringify(lines));
            res.json({ result: 'success' });
        } else if (action === 'delete_saved_line') {
            db.prepare('DELETE FROM saved_lines WHERE id = ?').run(req.body.id);
            res.json({ result: 'success' });
        }

        // --- Daily Log Actions ---
        else if (action === 'get_daily_logs') {
            const { userEmail, userRole, userTeam, limit } = req.body;
            let logs;
            const query = 'SELECT *, id, writerName AS name, writerTeam AS team FROM daily_logs';
            if (['관리자', '센터장', '팀장', '주임'].includes(userRole)) {
                logs = db.prepare(`${query} WHERE writerTeam = ? OR writerEmail = ? ORDER BY date DESC LIMIT ?`).all(userTeam || '', userEmail || '', limit || 100);
            } else {
                logs = db.prepare(`${query} WHERE writerEmail = ? ORDER BY date DESC LIMIT ?`).all(userEmail || '', limit || 100);
            }
            res.json({ result: 'success', logs });
        } else if (action === 'get_last_log') {
            const log = db.prepare('SELECT *, writerName AS name, writerTeam AS team FROM daily_logs WHERE writerEmail = ? ORDER BY date DESC LIMIT 1').get(req.body.email || '');
            res.json({ result: 'success', log: log || null });
        } else if (action === 'save_daily_log') {
            const { logId, date, plan, note, writerEmail, writerName, writerTeam } = req.body;
            const id = logId || `LOG_${Date.now()}`;
            const stmt = db.prepare(`INSERT OR REPLACE INTO daily_logs (id, date, plan, note, writerEmail, writerName, writerTeam, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`);
            stmt.run(id, date, plan, note, writerEmail, writerName, writerTeam);
            res.json({ result: 'success' });
        } else if (action === 'approve_daily_log') {
            const { logId, currentStatus } = req.body;
            db.prepare('UPDATE daily_logs SET status = ? WHERE id = ?').run(Number(currentStatus) + 1, logId);
            res.json({ result: 'success' });
        } else if (action === 'reject_daily_log') {
            const { logId, reason } = req.body;
            db.prepare('UPDATE daily_logs SET status = -1, rejectReason = ? WHERE id = ?').run(reason, logId);
            res.json({ result: 'success' });
        }

        // --- Doc Numbering Actions ---
        else if (action === 'issue') {
            const { docType, title, sender, target } = req.body;
            let docNum = '';
            // Using KST date
            const date = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

            let targetTable = 'doc_numbers';
            if (docType === '제정내') targetTable = 'doc_numbers_jejeongnae';
            else if (docType === '제정연') targetTable = 'doc_numbers_jejeongyeon';

            if (docType === '제정공' || docType === '제정내' || docType === '제정연') {
                // Sequential Numbering without Year (e.g., 제정공-1, 제정공-2)
                // Find max number for this docType
                const rows = db.prepare(`SELECT docNum FROM ${targetTable} WHERE docType = ?`).all(docType);
                let maxNum = 0;
                rows.forEach(r => {
                    const match = r.docNum.match(/-(\d+)$/); // Extract last digits
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num > maxNum) maxNum = num;
                    }
                });
                docNum = `${docType}-${maxNum + 1}`;
            } else {
                // Default Year-based Numbering (e.g., 일반-2024-001)
                const year = date.split('-')[0];
                const count = db.prepare(`SELECT COUNT(*) as count FROM ${targetTable} WHERE docType = ? AND date LIKE ?`).get(docType, `${year}%`).count + 1;
                docNum = `${docType}-${year}-${String(count).padStart(3, '0')}`;
            }

            const stmt = db.prepare(`INSERT INTO ${targetTable} (docNum, docType, title, sender, target, date) VALUES (?, ?, ?, ?, ?, ?)`);
            stmt.run(docNum, docType, title, sender, target, date);
            res.json({ result: 'success', data: { message: docNum } });
        } else if (action === 'get_pending_list') {
            const list = db.prepare(`
                SELECT * FROM doc_numbers WHERE status = '미발송'
            `).all();

            list.sort((a, b) => {
                if (a.date !== b.date) return a.date < b.date ? 1 : -1;
                const getNum = (s) => (s && s.match(/-(\d+)$/) ? parseInt(s.match(/-(\d+)$/)[1], 10) : 0);
                const numA = getNum(a.docNum), numB = getNum(b.docNum);
                if (numA !== numB) return numB - numA;
                return (b.docNum || '').localeCompare(a.docNum || '');
            });
            res.json({ result: 'success', list, data: { list } });
        } else if (action === 'get_ledger') {
            const { docType } = req.body;
            let targetTable = 'doc_numbers';
            if (docType === '제정내') targetTable = 'doc_numbers_jejeongnae';
            else if (docType === '제정연') targetTable = 'doc_numbers_jejeongyeon';

            const list = db.prepare(`SELECT * FROM ${targetTable} WHERE docType = ?`).all(docType);

            list.sort((a, b) => {
                if (a.date !== b.date) return a.date < b.date ? 1 : -1;
                const getNum = (s) => (s && s.match(/-(\d+)$/) ? parseInt(s.match(/-(\d+)$/)[1], 10) : 0);
                const numA = getNum(a.docNum), numB = getNum(b.docNum);
                if (numA !== numB) return numB - numA;
                return (b.docNum || '').localeCompare(a.docNum || '');
            });
            res.json({ result: 'success', list });
        } else if (action === 'search_doc_info') {
            const { docNumber } = req.body;
            if (!docNumber) return res.json({ result: 'success', data: { found: false } });
            
            // Search doc_numbers first (which only contains 제정공 and other non-internal docs now)
            let doc = db.prepare(`
                SELECT * FROM doc_numbers 
                WHERE docNum = ? OR docNum LIKE ? 
                ORDER BY date DESC 
                LIMIT 1
            `).get(String(docNumber), `%${docNumber}`);

            // If not found, check jejeongnae to give the user the warning message
            if (!doc) {
                doc = db.prepare(`SELECT * FROM doc_numbers_jejeongnae WHERE docNum = ? OR docNum LIKE ? ORDER BY date DESC LIMIT 1`).get(String(docNumber), `%${docNumber}`);
            }
            // If still not found, check jejeongyeon
            if (!doc) {
                doc = db.prepare(`SELECT * FROM doc_numbers_jejeongyeon WHERE docNum = ? OR docNum LIKE ? ORDER BY date DESC LIMIT 1`).get(String(docNumber), `%${docNumber}`);
            }
            
            if (doc) {
                if (doc.docType === '제정내') {
                    res.json({ result: 'success', data: { found: true, isValiddocType: false, docType: doc.docType } });
                } else {
                    res.json({ result: 'success', data: { found: true, isValiddocType: true, ...doc } });
                }
            } else {
                res.json({ result: 'success', data: { found: false } });
            }
        } else if (action === 'get_issued_doc') {
            const { id } = req.body;
            if (!id) return res.json({ result: 'error', message: 'ID가 없습니다.' });

            const prefix = String(id).split('-')[0];
            const prefixMap = {
                'VOU': 'issued_docs_voucher',
                'CNF': 'issued_docs_confirmation',
                'REPC': 'issued_docs_reply_child',
                'REPA': 'issued_docs_reply_adult',
                'REPS': 'issued_docs_reply_suicide',
                'REPR': 'issued_docs_reply_resignation',
                'REP': 'issued_docs_reply_letter',
                'DIS': 'issued_docs_dis',
                'JJY': 'issued_docs_jejungyeon',
                'CAL': 'issued_docs_calc',
                'LCF': 'issued_docs_lecture_conf',
                'RPT': 'issued_docs_report',
                'EMG': 'issued_docs_emergency',
                'BTR': 'issued_docs_biz_trip',
                'CMT': 'issued_docs_case_meeting'
            };

            let targetTable = prefixMap[prefix];
            
            try {
                let doc = null;
                
                if (targetTable) {
                    doc = db.prepare(`SELECT * FROM ${targetTable} WHERE id = ?`).get(String(id));
                } else {
                    // Fallback for legacy "DOC-" prefixes that might be hiding anywhere
                    const allTables = Object.values(prefixMap);
                    for (let tbl of allTables) {
                        try {
                            doc = db.prepare(`SELECT * FROM ${tbl} WHERE id = ?`).get(String(id));
                            if (doc) break;
                        } catch (e) {
                            // Ignore missing tables during scan
                        }
                    }
                }

                if (doc) {
                    let contentRaw = doc.content_json;
                    if (typeof contentRaw === 'string') {
                        try { contentRaw = JSON.parse(contentRaw); } catch (e) { }
                    }
                    res.json({ result: 'success', data: { ...doc, content: contentRaw } });
                } else {
                    res.json({ result: 'error', message: '문서를 찾을 수 없습니다.' });
                }
            } catch (err) {
                res.json({ result: 'error', message: err.message });
            }
        } else if (action === 'mark_sent') {
            const { docNumber, sentDate } = req.body;
            let targetTable = 'doc_numbers';
            if (String(docNumber).startsWith('제정연')) targetTable = 'doc_numbers_jejeongyeon';
            
            // Use exact or partial match but consistent
            const stmt = db.prepare(`UPDATE ${targetTable} SET sentDate = ?, status = '발송완료' WHERE docNum = ? OR docNum LIKE ?`);
            stmt.run(sentDate, String(docNumber), `%${docNumber}`);
            res.json({ result: 'success' });

            // --- [신규] 문서 발급 (의뢰서/확인서) ---
        } else if (action === 'save_issued_doc') {
            const { type, target_name, content, issuer, status } = req.body;
            // ID 생성 (예: VOU-20240220-123456)
            
            const docTypesMap = {
                'voucher': { table: 'issued_docs_voucher', prefix: 'VOU' },
                'confirmation': { table: 'issued_docs_confirmation', prefix: 'CNF' },
                'reply_child': { table: 'issued_docs_reply_child', prefix: 'REPC' },
                'reply_adult': { table: 'issued_docs_reply_adult', prefix: 'REPA' },
                'reply_suicide': { table: 'issued_docs_reply_suicide', prefix: 'REPS' },
                'reply_resignation': { table: 'issued_docs_reply_resignation', prefix: 'REPR' },
                '퇴사통회신서발행기': { table: 'issued_docs_dis', prefix: 'DIS' },
                'jejungyeon': { table: 'issued_docs_jejungyeon', prefix: 'JJY' },
                '강사비산출내역서': { table: 'issued_docs_calc', prefix: 'CAL' },
                '강의확인서': { table: 'issued_docs_lecture_conf', prefix: 'LCF' },
                '사례종결보고서-2026년': { table: 'issued_docs_report', prefix: 'RPT' },
                '응급개입 기록지(수정본)': { table: 'issued_docs_emergency', prefix: 'EMG' },
                '출장복명서': { table: 'issued_docs_biz_trip', prefix: 'BTR' },
                '사례회의록': { table: 'issued_docs_case_meeting', prefix: 'CMT' }
            };

            const mapInfo = docTypesMap[type];
            if (!mapInfo) {
                return res.json({ result: 'error', message: '지원하지 않는 문서 종류입니다: ' + type });
            }

            const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const randomSuffix = Math.floor(Math.random() * 900000) + 100000;
            const prefix = mapInfo.prefix;
            const targetTable = mapInfo.table;
            
            const id = `${prefix}-${datePrefix}-${randomSuffix}`;
            let finalStatus = status || '발급 완료'; // Default to '발급 완료'
            
            const approvalTypes = ['사례종결보고서-2026년', '응급개입 기록지(수정본)', '출장복명서', '사례회의록'];
            if (!status && approvalTypes.includes(type)) {
                finalStatus = '결재 대기';
            }

            const stmt = db.prepare(`INSERT INTO ${targetTable} (id, type, target_name, content_json, issuer, created_at, status) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?)`);
            stmt.run(id, type, target_name, JSON.stringify(content || {}), issuer, finalStatus);

            res.json({ result: 'success', id });

        } else if (action === 'get_issued_docs') {
            const docTypesMap = {
                'voucher': { table: 'issued_docs_voucher', prefix: 'VOU' },
                'confirmation': { table: 'issued_docs_confirmation', prefix: 'CNF' },
                'reply_child': { table: 'issued_docs_reply_child', prefix: 'REPC' },
                'reply_adult': { table: 'issued_docs_reply_adult', prefix: 'REPA' },
                'reply_suicide': { table: 'issued_docs_reply_suicide', prefix: 'REPS' },
                'reply_resignation': { table: 'issued_docs_reply_resignation', prefix: 'REPR' },
                '퇴사통회신서발행기': { table: 'issued_docs_dis', prefix: 'DIS' },
                'jejungyeon': { table: 'issued_docs_jejungyeon', prefix: 'JJY' },
                '강사비산출내역서': { table: 'issued_docs_calc', prefix: 'CAL' },
                '강의확인서': { table: 'issued_docs_lecture_conf', prefix: 'LCF' },
                '사례종결보고서-2026년': { table: 'issued_docs_report', prefix: 'RPT' },
                '응급개입 기록지(수정본)': { table: 'issued_docs_emergency', prefix: 'EMG' },
                '출장복명서': { table: 'issued_docs_biz_trip', prefix: 'BTR' },
                '사례회의록': { table: 'issued_docs_case_meeting', prefix: 'CMT' }
            };
            const tables = Object.values(docTypesMap).map(m => m.table);
            const unionQuery = tables.map(t => `SELECT id, type, target_name, issuer, created_at, status FROM ${t}`).join(' UNION ALL ');

            const list = db.prepare(`SELECT * FROM (${unionQuery}) ORDER BY created_at DESC, id DESC`).all();
            res.json({ result: 'success', list });

        } else if (action === 'get_issued_doc_detail') {
            const { id } = req.body;
            const docTypesMap = {
                'voucher': { table: 'issued_docs_voucher', prefix: 'VOU' },
                'confirmation': { table: 'issued_docs_confirmation', prefix: 'CNF' },
                'reply_child': { table: 'issued_docs_reply_child', prefix: 'REPC' },
                'reply_adult': { table: 'issued_docs_reply_adult', prefix: 'REPA' },
                'reply_suicide': { table: 'issued_docs_reply_suicide', prefix: 'REPS' },
                'reply_resignation': { table: 'issued_docs_reply_resignation', prefix: 'REPR' },
                '퇴사통회신서발행기': { table: 'issued_docs_dis', prefix: 'DIS' },
                'jejungyeon': { table: 'issued_docs_jejungyeon', prefix: 'JJY' },
                '강사비산출내역서': { table: 'issued_docs_calc', prefix: 'CAL' },
                '강의확인서': { table: 'issued_docs_lecture_conf', prefix: 'LCF' },
                '사례종결보고서-2026년': { table: 'issued_docs_report', prefix: 'RPT' },
                '응급개입 기록지(수정본)': { table: 'issued_docs_emergency', prefix: 'EMG' },
                '출장복명서': { table: 'issued_docs_biz_trip', prefix: 'BTR' },
                '사례회의록': { table: 'issued_docs_case_meeting', prefix: 'CMT' }
            };
            const tables = Object.values(docTypesMap).map(m => m.table);
            const unionQuery = tables.map(t => `SELECT * FROM ${t}`).join(' UNION ALL ');

            const doc = db.prepare(`SELECT * FROM (${unionQuery}) WHERE id = ?`).get(id);
            if (doc) {
                res.json({ result: 'success', doc });
            } else {
                res.json({ result: 'fail', message: 'Document not found' });
            }
        }

        // --- Case Management Actions ---
        else if (action === 'save_inquiry') {
            const updates = { ...req.body };
            delete updates.action;

            let targetTable = 'inquiries';
            const rawCategory = updates.category || '기타';
            if (rawCategory === '아동청소년') targetTable = 'inquiries_child';
            else if (rawCategory === '성인') targetTable = 'inquiries_adult';
            else if (rawCategory === '자살') targetTable = 'inquiries_suicide';
            else if (rawCategory === '퇴사통' || rawCategory === '퇴원사실통보') targetTable = 'inquiries_resignation';

            // Generate sequence ID based on category prefix
            if (!updates.id) {
                // '퇴원사실통보' -> '퇴원' 으로 줄임표시 (유저 요청: 퇴원-1)
                let prefix = rawCategory === '퇴원사실통보' || rawCategory === '퇴사통' ? '퇴원' : rawCategory;

                // Query existing max number for the prefix
                const rows = db.prepare(`SELECT id FROM ${targetTable} WHERE id LIKE ?`).all(`${prefix}-%`);
                let maxNum = 0;
                rows.forEach(r => {
                    const match = r.id.match(/-(\d+)$/);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num > maxNum) maxNum = num;
                    }
                });
                updates.id = `${prefix}-${maxNum + 1}`;
            }

            // Include 'id' dynamically even if it wasn't in INQUIRY_COLUMNS previously, since it is the primary key.
            const keys = Object.keys(updates).filter(k => (INQUIRY_COLUMNS.includes(k) || k === 'id') && updates[k] !== undefined);

            const columns = keys.join(', ');
            const placeholders = keys.map(() => '?').join(', ');
            const values = keys.map(k => updates[k]);

            const stmt = db.prepare(`INSERT INTO ${targetTable} (${columns}) VALUES (${placeholders})`);
            stmt.run(...values);
            res.json({ result: 'success' });
        } else if (action === 'get_pending') {
            let pendingTable = 'inquiries';
            const pendingCategory = req.body.category || '';
            if (pendingCategory === '아동청소년') pendingTable = 'inquiries_child';
            else if (pendingCategory === '성인') pendingTable = 'inquiries_adult';
            else if (pendingCategory === '자살') pendingTable = 'inquiries_suicide';
            else if (pendingCategory === '퇴사통' || pendingCategory === '퇴원사실통보') pendingTable = 'inquiries_resignation';

            const list = db.prepare(`SELECT *, id as rowIndex FROM ${pendingTable} WHERE (status = '대기' OR status IS NULL) AND category = ?`).all(pendingCategory);
            res.json({ result: 'success', list });
        } else if (action === 'get_case_ledger') {
            let ledgerTable = 'inquiries';
            const ledgerCategory = req.body.category || '';
            if (ledgerCategory === '아동청소년') ledgerTable = 'inquiries_child';
            else if (ledgerCategory === '성인') ledgerTable = 'inquiries_adult';
            else if (ledgerCategory === '자살') ledgerTable = 'inquiries_suicide';
            else if (ledgerCategory === '퇴사통' || ledgerCategory === '퇴원사실통보') ledgerTable = 'inquiries_resignation';

            const list = db.prepare(`SELECT *, id as rowIndex FROM ${ledgerTable} WHERE category = ? ORDER BY date DESC`).all(ledgerCategory);
            res.json({ result: 'success', list });
        } else if (action === 'get_case_detail') {
            const { id, rowIndex, category } = req.body;
            let detailTable = 'inquiries';
            const detailCategory = category || '';
            if (detailCategory === '아동청소년') detailTable = 'inquiries_child';
            else if (detailCategory === '성인') detailTable = 'inquiries_adult';
            else if (detailCategory === '자살') detailTable = 'inquiries_suicide';
            else if (detailCategory === '퇴사통' || detailCategory === '퇴원사실통보') detailTable = 'inquiries_resignation';

            const data = db.prepare(`SELECT *, id AS rowIndex, agencyDetail AS agency FROM ${detailTable} WHERE id = ?`).get(id || rowIndex);
            res.json({ result: 'success', data: { data } });
        } else if (action === 'update_status') {
            const updates = { ...req.body };
            const id = updates.id || updates.rowIndex;
            delete updates.action;
            delete updates.id;
            delete updates.rowIndex;
            
            let updateTable = 'inquiries';
            const updateCategory = updates.category || ''; // Category must be passed to update_status to find correct table
            if (updateCategory === '아동청소년') updateTable = 'inquiries_child';
            else if (updateCategory === '성인') updateTable = 'inquiries_adult';
            else if (updateCategory === '자살') updateTable = 'inquiries_suicide';
            else if (updateCategory === '퇴사통' || updateCategory === '퇴원사실통보') updateTable = 'inquiries_resignation';

            const keys = Object.keys(updates).filter(k => INQUIRY_COLUMNS.includes(k) && updates[k] !== undefined);
            const setClause = keys.map(k => `${k} = ?`).join(', ');
            const values = keys.map(k => updates[k]);
            values.push(id);
            db.prepare(`UPDATE ${updateTable} SET ${setClause} WHERE id = ?`).run(...values);
            res.json({ result: 'success' });
        }

        // --- Circulation Actions ---
        else if (action === 'get_circ_list') {
            const list = db.prepare('SELECT * FROM circulation ORDER BY date DESC').all();
            const parsedList = list.map(c => ({
                ...c,
                attachments: safeParse(c.attachments),
                readers: safeParse(c.readers)
            }));
            res.json({ result: 'success', list: parsedList });
        } else if (action === 'save_circ') {
            const { id, title, content, author, mainFile, attachments, readers } = req.body;
            const targetId = id || `C_${Date.now()}`;

            // Check if this is a new circulation to trigger notification
            const existing = db.prepare('SELECT id, date FROM circulation WHERE id = ?').get(targetId);
            const isNew = !existing;

            let date;
            if (existing && existing.date) {
                // Keep the original creation date when editing
                date = existing.date;
            } else {
                // Use KST YYYY-MM-DD HH:mm for new creations
                const now = new Date();
                date = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().replace('T', ' ').substring(0, 16);
            }

            const stmt = db.prepare('INSERT OR REPLACE INTO circulation (id, title, content, author, date, mainFile, attachments, readers) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            stmt.run(targetId, title, content, author, date, mainFile, JSON.stringify(attachments || []), JSON.stringify(readers || []));

            // --- Notification Logic ---
            if (isNew) {
                const activeMembers = db.prepare("SELECT id, name FROM members WHERE status != '퇴사' AND status != '휴직' AND status != 'Inactive'").all();
                const activeReaders = activeMembers.filter(m => m.name !== author && m.id !== author).map(m => m.id);
                eventBus.emit('circulation:created', { author, title, docId: targetId, readers: activeReaders });
            }
            res.json({ result: 'success' });
        } else if (action === 'confirm_read') {
            const { id, readerName } = req.body;
            const doc = db.prepare('SELECT readers FROM circulation WHERE id = ?').get(id);
            const readers = safeParse(doc?.readers);
            if (!readers.includes(readerName)) readers.push(readerName);
            db.prepare('UPDATE circulation SET readers = ? WHERE id = ?').run(JSON.stringify(readers), id);
            res.json({ result: 'success', readers });
        } else if (action === 'delete_circ') {
            db.prepare('DELETE FROM circulation WHERE id = ?').run(req.body.id);
            res.json({ result: 'success' });
        } else if (action === 'notify_unread_circ') {
            const { id } = req.body;
            const doc = db.prepare('SELECT title, author, readers FROM circulation WHERE id = ?').get(id);
            if (!doc) return res.json({ result: 'fail', message: '문서를 찾을 수 없습니다.' });

            const readers = safeParse(doc.readers);
            const activeMembers = db.prepare("SELECT id, name FROM members WHERE status != '퇴사' AND status != '휴직' AND status != 'Inactive'").all();

            const unreadUserIds = activeMembers.filter(m => !readers.includes(m.name) && m.name !== doc.author && m.id !== doc.author).map(m => m.id);
            if (unreadUserIds.length > 0) {
                eventBus.emit('circulation:unread_reminder', { unreadUserIds, title: doc.title });
                notifiedCount = unreadUserIds.length;
            }
            res.json({ result: 'success', count: notifiedCount });

            // --- [신규주간보고] 업무 카테고리 ---
        } else if (action === 'get_master_categories') {
            const list = db.prepare('SELECT * FROM master_categories ORDER BY category_name ASC').all();
            res.json({ result: 'success', list });
        } else if (action === 'save_master_category') {
            const { id, category_name } = req.body;
            db.prepare('INSERT OR REPLACE INTO master_categories (id, category_name) VALUES (?, ?)').run(id, category_name);
            res.json({ result: 'success' });
        } else if (action === 'delete_master_category') {
            // 관리자 및 사용자 요청으로 대분류 삭제 허용
            db.prepare('DELETE FROM master_categories WHERE id = ?').run(req.body.id);
            res.json({ result: 'success' });

            // --- [신규주간보고] 사용자 커스텀 업무 목록 ---
        } else if (action === 'get_user_tasks') {
            const { user_id } = req.body;
            let list = [];
            if (user_id) {
                list = db.prepare(`
                    SELECT ut.*, mc.category_name 
                    FROM user_tasks ut
                    LEFT JOIN master_categories mc ON ut.category_id = mc.id
                    WHERE ut.user_id = ?
                    ORDER BY mc.category_name ASC, ut.task_name ASC
                `).all(user_id);
            } else {
                list = db.prepare(`
                    SELECT ut.*, mc.category_name 
                    FROM user_tasks ut
                    LEFT JOIN master_categories mc ON ut.category_id = mc.id
                    ORDER BY mc.category_name ASC, ut.task_name ASC
                `).all();
            }
            res.json({ result: 'success', list });
        } else if (action === 'save_user_task') {
            const { id, user_id, category_id, task_name, target_goal, target_goal_2 } = req.body;
            db.prepare('INSERT OR REPLACE INTO user_tasks (id, user_id, category_id, task_name, target_goal, target_goal_2) VALUES (?, ?, ?, ?, ?, ?)').run(id, user_id, category_id, task_name, target_goal || 0, target_goal_2 || 0);
            res.json({ result: 'success' });
        } else if (action === 'toggle_user_task') {
            const { id, is_active } = req.body;
            db.prepare('UPDATE user_tasks SET is_active = ? WHERE id = ?').run(is_active, id);
            res.json({ result: 'success' });
        } else if (action === 'delete_user_task') {
            db.prepare('DELETE FROM user_tasks WHERE id = ?').run(req.body.id);
            res.json({ result: 'success' });
        } else if (action === 'edit_user_task') {
            const { id, task_name, target_goal, target_goal_2 } = req.body;
            db.prepare('UPDATE user_tasks SET task_name = ?, target_goal = ?, target_goal_2 = ? WHERE id = ?').run(task_name, target_goal || 0, target_goal_2 || 0, id);
            res.json({ result: 'success' });

            // --- [신규주간보고] 일일 실적 로그 ---
        } else if (action === 'get_work_logs') {
            const { user_id, work_date, start_date, end_date } = req.body;
            let list = [];
            if (user_id && work_date) {
                // 특정 사용자의 특정 날짜 조회 (대시보드용)
                list = db.prepare(`
                    SELECT wl.*, ut.task_name, mc.category_name
                    FROM work_logs wl
                    JOIN user_tasks ut ON wl.user_task_id = ut.id
                    LEFT JOIN master_categories mc ON ut.category_id = mc.id
                    WHERE ut.user_id = ? AND wl.work_date = ?
                `).all(user_id, work_date);
            } else if (start_date && end_date) {
                // 주간보고 통계용
                list = db.prepare(`
                    SELECT wl.*, ut.task_name, ut.user_id, mc.category_name
                    FROM work_logs wl
                    JOIN user_tasks ut ON wl.user_task_id = ut.id
                    LEFT JOIN master_categories mc ON ut.category_id = mc.id
                    WHERE wl.work_date >= ? AND wl.work_date <= ?
                `).all(start_date, end_date);
            }
            res.json({ result: 'success', list });
        } else if (action === 'upsert_work_log') {
            const { id, user_task_id, work_date, status, isp_count, isp_count_2, memo } = req.body;
            // id가 없으면 고유 ID 생성
            const logId = id || `WL_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            db.prepare(`
                INSERT INTO work_logs (id, user_task_id, work_date, status, isp_count, isp_count_2, memo, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET 
                status = excluded.status, 
                isp_count = excluded.isp_count, 
                isp_count_2 = excluded.isp_count_2, 
                memo = excluded.memo, 
                updated_at = excluded.updated_at
            `).run(logId, user_task_id, work_date, status, isp_count || 0, isp_count_2 || 0, memo || '');
            res.json({ result: 'success', id: logId });

            // --- [신규주간보고] 특이사례 보고 ---
        } else if (action === 'get_weekly_cases') {
            const { report_week, start_date, end_date } = req.body;
            let list = [];
            if (report_week) {
                list = db.prepare('SELECT * FROM weekly_cases WHERE report_week = ? ORDER BY category, client_name').all(report_week);
            } else if (start_date && end_date) {
                // 날짜 기반으로 조회 (intervention_date)
                list = db.prepare('SELECT * FROM weekly_cases WHERE intervention_date >= ? AND intervention_date <= ? ORDER BY category, intervention_date').all(start_date, end_date);
            }
            res.json({ result: 'success', list });
        } else if (action === 'save_weekly_case') {
            const { id, report_week, category, client_name, gender_age, referral_path, chief_complaint, scale_score, scale_score_2, action_result, intervention_date, manager_name } = req.body;
            const caseId = id || `WC_${Date.now()}`;
            db.prepare(`
                INSERT OR REPLACE INTO weekly_cases 
                (id, report_week, category, client_name, gender_age, referral_path, chief_complaint, scale_score, scale_score_2, action_result, intervention_date, manager_name) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(caseId, report_week || '', category || '', client_name || '', gender_age || '', referral_path || '', chief_complaint || '', scale_score || '', scale_score_2 || '', action_result || '', intervention_date || '', manager_name || '');
            res.json({ result: 'success' });
        } else if (action === 'delete_weekly_case') {
            db.prepare('DELETE FROM weekly_cases WHERE id = ?').run(req.body.id);
            res.json({ result: 'success' });
        }

        // --- E-Approval APIs ---
        else if (action === 'create_approval') {
            const { id, drafter_id, title, type, content, lines } = req.body;

            const typeMap = { 'GENERAL': '일반 기안', 'LEAVE': '휴가 신청서', 'TRIP': '출장 신청서', 'CASE_CLOSURE': '사례종결보고서', 'EMERGENCY_INTERVENTION': '응급개입기록지', 'TRIP_REPORT': '출장복명서', 'CASE_CONFERENCE': '사례회의록' };
            const prefixMap = { 'GENERAL': '기안', 'LEAVE': '휴가', 'TRIP': '출장신청', 'CASE_CLOSURE': '종결', 'EMERGENCY_INTERVENTION': '응급', 'TRIP_REPORT': '복명', 'CASE_CONFERENCE': '회의' };
            const prefix = prefixMap[type] || '기안';

            // Generate Readable ID: PREFIX-YYYY-SEQ
            const year = new Date().getFullYear();
            const count = db.prepare('SELECT COUNT(*) as count FROM approvals WHERE id LIKE ? AND created_at LIKE ?').get(`${prefix}-%`, `${year}%`).count + 1;
            const seq = String(count).padStart(3, '0');
            const approval_id = id || `${prefix}-${year}-${seq}`;

            const typeLabel = typeMap[type] || type;

            db.transaction(() => {
                if (id) {
                    // Update existing document (Re-drafting)
                    const oldDoc = db.prepare(`SELECT content, drafter_id FROM approvals WHERE id = ?`).get(id);
                    const parsedOldContent = JSON.parse(oldDoc.content || '{}');

                    const oldLines = db.prepare(`SELECT * FROM approval_lines WHERE approval_id = ? ORDER BY step_order ASC`).all(id);

                    // We want to keep all previous history
                    let historyToAdd = oldLines
                        .filter(l => l.status !== 'WAITING' && l.status !== 'PENDING') // Keep anything that was acted upon
                        .map(l => ({
                            approver_name: l.approver_name,
                            approver_id: l.approver_id,
                            status: l.status,
                            comment: l.comment,
                            acted_at: l.acted_at
                        }));

                    // We also want to record the drafter's previous comment as a history entry if they are redrafting
                    if (parsedOldContent.drafter_comment) {
                        // Insert at the beginning of this history block
                        historyToAdd.unshift({
                            approver_name: '기안자',
                            approver_id: oldDoc.drafter_id,
                            status: 'DRAFTED',
                            comment: parsedOldContent.drafter_comment,
                            acted_at: new Date().toISOString() // Or original created_at if we stored it
                        });
                    }

                    let oldHistory = [];
                    if (parsedOldContent.history && Array.isArray(parsedOldContent.history)) {
                        oldHistory = parsedOldContent.history;
                    }

                    if (historyToAdd.length > 0) {
                        content.history = oldHistory.concat(historyToAdd);
                    } else if (oldHistory.length > 0) {
                        content.history = oldHistory;
                    }

                    db.prepare(`UPDATE approvals SET title = ?, type = ?, content = ?, status = 'IN_PROGRESS', current_step = 0, created_at = CURRENT_TIMESTAMP WHERE id = ?`)
                        .run(title, type, JSON.stringify(content), id);
                    // Clear old approval lines
                    db.prepare(`DELETE FROM approval_lines WHERE approval_id = ?`).run(id);
                } else {
                    // Create new document
                    db.prepare(`INSERT INTO approvals (id, drafter_id, title, type, content, status, current_step) VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', 0)`)
                        .run(approval_id, drafter_id, title, type, JSON.stringify(content));
                }

                if (content.linkedDocId) {
                    eventBus.emit('approval:created', { linkedDocId: content.linkedDocId });
                }

                const lineStmt = db.prepare(`INSERT INTO approval_lines (approval_id, step_order, approver_id, approver_name, status) VALUES (?, ?, ?, ?, 'WAITING')`);
                lines.forEach((line, idx) => {
                    lineStmt.run(approval_id, idx, line.approver_id, line.approver_name);
                });

                db.prepare(`UPDATE approval_lines SET status = 'PENDING' WHERE approval_id = ? AND step_order = 0`).run(approval_id);

                // Notify first approver
                eventBus.emit('approval:requested', {
                    title,
                    approval_id,
                    typeLabel,
                    nextApproverId: lines[0].approver_id
                });
            })();

            res.json({ result: 'success', approval_id });
        }
        else if (action === 'get_approvals') {
            const { user_id, mode } = req.body;
            let list = [];
            if (mode === 'sent') {
                list = db.prepare(`SELECT * FROM approvals WHERE drafter_id = ? ORDER BY created_at DESC`).all(user_id);
            } else if (mode === 'todo') {
                list = db.prepare(`
                    SELECT a.* FROM approvals a
                    JOIN approval_lines al ON a.id = al.approval_id
                    WHERE al.approver_id = ? AND al.status = 'PENDING' AND a.status = 'IN_PROGRESS'
                `).all(user_id);
            } else if (mode === 'all_my') {
                // Documents drafted by the user OR where the user is an approver (regardless of status, but keep withdrawn visible to drafter only if needed, mostly we show all)
                list = db.prepare(`
                    SELECT DISTINCT a.* FROM approvals a
                    LEFT JOIN approval_lines al ON a.id = al.approval_id
                    WHERE (a.drafter_id = ? OR al.approver_id = ?) AND a.status != 'WITHDRAWN'
                    ORDER BY a.created_at DESC
                `).all(user_id, user_id);
            } else {
                list = db.prepare(`SELECT * FROM approvals WHERE status != 'WITHDRAWN' ORDER BY created_at DESC LIMIT 50`).all();
            }

            const enriched = list.map(app => {
                const lines = db.prepare(`SELECT * FROM approval_lines WHERE approval_id = ? ORDER BY step_order ASC`).all(app.id);
                return { ...app, content: JSON.parse(app.content || '{}'), lines };
            });

            res.json({ result: 'success', list: enriched });
        }
        else if (action === 'update_approval_status') {
            const { approval_id, approver_id, status, comment } = req.body;

            try {
                db.transaction(() => {
                    const app = db.prepare(`SELECT * FROM approvals WHERE id = ?`).get(approval_id);
                    const line = db.prepare(`SELECT * FROM approval_lines WHERE approval_id = ? AND approver_id = ? AND status = 'PENDING'`).get(approval_id, approver_id);

                    if (!app || !line) throw new Error('Invalid approval or access');

                    db.prepare(`UPDATE approval_lines SET status = ?, comment = ?, acted_at = datetime('now', 'localtime') WHERE approval_id = ? AND step_order = ?`)
                        .run(status, comment || '', approval_id, line.step_order);

                    if (status === 'REJECTED') {
                        db.prepare(`UPDATE approvals SET status = 'REJECTED' WHERE id = ?`).run(approval_id);

                        const contentObj = safeParse(app.content) || {};
                        const prevApprovers = db.prepare(`SELECT approver_id FROM approval_lines WHERE approval_id = ? AND step_order < ? AND status = 'APPROVED'`).all(approval_id, line.step_order);
                        const prevIds = Array.from(new Set(prevApprovers.map(a => a.approver_id)));

                        eventBus.emit('approval:rejected', {
                            drafter_id: app.drafter_id,
                            title: app.title,
                            approval_id: approval_id,
                            comment,
                            linkedDocId: contentObj.linkedDocId,
                            prevApproverIds: prevIds
                        });
                    } else {
                        const nextStep = db.prepare(`SELECT * FROM approval_lines WHERE approval_id = ? AND step_order = ?`).get(approval_id, line.step_order + 1);
                        if (nextStep) {
                            db.prepare(`UPDATE approval_lines SET status = 'PENDING' WHERE approval_id = ? AND step_order = ?`).run(approval_id, line.step_order + 1);
                            db.prepare(`UPDATE approvals SET current_step = ? WHERE id = ?`).run(line.step_order + 1, approval_id);

                            eventBus.emit('approval:requested', {
                                title: app.title,
                                approval_id: approval_id,
                                nextApproverId: nextStep.approver_id
                            });
                        } else {
                            db.prepare(`UPDATE approvals SET status = 'APPROVED' WHERE id = ?`).run(approval_id);

                            const contentObj = safeParse(app.content) || {};
                            eventBus.emit('approval:completed', {
                                drafter_id: app.drafter_id,
                                title: app.title,
                                approval_id: approval_id,
                                linkedDocId: contentObj.linkedDocId
                            });
                        }
                    }
                })();
                res.json({ result: 'success' });
            } catch (err) {
                res.json({ result: 'error', message: err.message });
            }
        }
        else if (action === 'cancel_approval') {
            const { approval_id, approver_id } = req.body;
            try {
                db.transaction(() => {
                    const app = db.prepare(`SELECT * FROM approvals WHERE id = ?`).get(approval_id);
                    if (!app) throw new Error('문서를 찾을 수 없습니다.');
                    if (app.status !== 'IN_PROGRESS') throw new Error('진행 중인 결재 문서만 취소할 수 있습니다.');

                    // Get the current approver's line
                    const myLine = db.prepare(`SELECT * FROM approval_lines WHERE approval_id = ? AND approver_id = ?`).get(approval_id, approver_id);
                    if (!myLine) throw new Error('결재선에 존재하지 않습니다.');
                    if (myLine.status !== 'APPROVED') throw new Error('본인이 승인 완료한 상태가 아닙니다.');

                    // Get the next approver's line (if any)
                    const nextLine = db.prepare(`SELECT * FROM approval_lines WHERE approval_id = ? AND step_order = ?`).get(approval_id, myLine.step_order + 1);
                    if (nextLine && nextLine.status !== 'PENDING' && nextLine.status !== 'WAITING') {
                        throw new Error('다음 단계 결재자가 이미 확인하여 취소할 수 없습니다.');
                    }

                    // Undo current approver
                    db.prepare(`UPDATE approval_lines SET status = 'PENDING', comment = '', acted_at = NULL WHERE approval_id = ? AND step_order = ?`)
                        .run(approval_id, myLine.step_order);
                    
                    // Undo next approver and reset pointer
                    if (nextLine) {
                        db.prepare(`UPDATE approval_lines SET status = 'WAITING' WHERE approval_id = ? AND step_order = ?`)
                            .run(approval_id, nextLine.step_order);
                        
                        db.prepare(`UPDATE approvals SET current_step = ? WHERE id = ?`)
                            .run(myLine.step_order, approval_id);
                    }
                })();
                res.json({ result: 'success' });
            } catch (err) {
                res.json({ result: 'error', message: err.message });
            }
        }
        else if (action === 'withdraw_approval') {
            const { approval_id, user_id } = req.body;
            try {
                db.transaction(() => {
                    const app = db.prepare('SELECT * FROM approvals WHERE id = ?').get(approval_id);
                    if (!app) throw new Error('Document not found');
                    if (app.drafter_id !== user_id) throw new Error('Unauthorized');
                    if (app.status !== 'IN_PROGRESS') throw new Error('Cannot withdraw completed or already withdrawn document');

                    // Check if any approval has been made yet (optional, but "Recall" usually implies before anyone acts or just before final)
                    // For now, allow recall as long as it is IN_PROGRESS. 
                    // Update main status
                    db.prepare("UPDATE approvals SET status = 'WITHDRAWN' WHERE id = ?").run(approval_id);
                    // Update all PENDING lines to CANCELED or similar if needed, or just leave them. 
                    // Let's set PENDING to WITHDRAWN for clarity in history
                    db.prepare("UPDATE approval_lines SET status = 'WITHDRAWN' WHERE approval_id = ? AND status = 'PENDING'").run(approval_id);

                    // Sync linked document status
                    const contentObj = safeParse(app.content) || {};
                    if (contentObj.linkedDocId) {
                        eventBus.emit('approval:withdrawn', { linkedDocId: contentObj.linkedDocId });
                    }
                })();
                res.json({ result: 'success' });
            } catch (err) {
                res.json({ result: 'error', message: err.message });
            }
        }
        else if (action === 'delete_approval') {
            const { approval_id, user_id } = req.body;
            try {
                // Ensure the user actually owns this approval before permitting deletion
                const app = db.prepare('SELECT drafter_id, status FROM approvals WHERE id = ?').get(approval_id);
                if (!app) {
                    return res.json({ result: 'error', message: '문서를 찾을 수 없습니다.' });
                }
                if (app.drafter_id !== user_id) {
                    return res.json({ result: 'error', message: '본인이 기안한 문서만 삭제할 수 있습니다.' });
                }
                if (app.status !== 'REJECTED' && app.status !== 'WITHDRAWN') {
                    return res.json({ result: 'error', message: '반려되거나 회수된 문서만 삭제 가능합니다.' });
                }

                // Delete dependencies first (approval_lines) then the main row
                db.prepare('DELETE FROM approval_lines WHERE approval_id = ?').run(approval_id);
                db.prepare('DELETE FROM approvals WHERE id = ?').run(approval_id);

                res.json({ result: 'success' });
            } catch (err) {
                res.json({ result: 'error', message: err.message });
            }
        }

        // --- Notification APIs ---
        else if (action === 'get_notifications') {
            const { user_id } = req.body;

            // 1. [신규 로직] 미확인 공람 문서 알람 트리거 (접속 시마다 체크)
            try {
                const user = db.prepare('SELECT name FROM members WHERE id = ?').get(user_id);
                if (user) {
                    const userName = user.name;
                    // 전체 공람 목록 조회
                    const circs = db.prepare('SELECT id, title, date, readers FROM circulation').all();
                    const now = new Date();
                    const nowStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                    const msPerDay = 1000 * 60 * 60 * 24;

                    circs.forEach(c => {
                        const readers = safeParse(c.readers);
                        // 이 사람이 아직 안 읽었을 경우
                        if (!readers.includes(userName)) {
                            // 날짜 차이 계산
                            const createDate = new Date(c.date);
                            const today = new Date(nowStr);
                            const diffDays = Math.floor((today - createDate) / msPerDay);

                            if (diffDays >= 2) {
                                // 2일 경과(Warning) 또는 4일 경과(Critical)
                                const isCritical = diffDays >= 4;
                                const notiType = isCritical ? 'CIRC_WARN_4' : 'CIRC_WARN_2';
                                const notiTitle = isCritical ? '🚨 긴급 공람 경고' : '💬 공람 리마인드';
                                const notiMsg = isCritical
                                    ? `[경고] '${c.title}' 공람이 ${diffDays}일째 미확인 상태입니다. 즉시 확인해 주세요!`
                                    : `[리마인드] '${c.title}' 공람을 아직 확인하지 않으셨습니다.`;

                                // 이미 같은 타입의 알람을 이 문서에 대해 보냈는지 체크 (중복 방지)
                                // 메시지나 링크에 문서 ID를 담아서 식별하는 방식 사용
                                const existingAlert = db.prepare(`SELECT id FROM notifications WHERE user_id = ? AND type = ? AND link LIKE ?`).get(user_id, notiType, `%${c.id}%`);

                                if (!existingAlert) {
                                    sendInternalNotification(user_id, notiType, notiTitle, notiMsg, `./apps/circulation.html?focus=${c.id}`);
                                }
                            }
                        }
                    });
                }
            } catch (e) {
                console.error('[Notification Check Error]', e.message);
            }

            // 2. Schedule Reminder Logic (Virtual Notifications)
            let virtualNotis = [];
            try {
                // Get today's date string in local timezone (KST)
                const now = new Date();
                const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
                const todayStr = today.toISOString().split('T')[0];

                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toISOString().split('T')[0];

                // Get events for user or center ('전체')
                const userRec = db.prepare('SELECT name FROM members WHERE id = ?').get(user_id);
                if (userRec) {
                    const upcomingEvents = db.prepare(`
                        SELECT * FROM events 
                        WHERE (calendarId = ? OR calendarId = '전체') 
                        AND (start LIKE ? OR start LIKE ?)
                        ORDER BY start ASC
                    `).all(user_id, `${todayStr}%`, `${tomorrowStr}%`);

                    upcomingEvents.forEach(evt => {
                        const isToday = evt.start.startsWith(todayStr);
                        virtualNotis.push({
                            id: 'virt_evt_' + evt.id,
                            user_id: user_id,
                            type: 'SCHEDULE',
                            title: isToday ? '📅 [오늘 일정] ' + evt.title : '📅 [내일 일정] ' + evt.title,
                            message: `[일정 안내] ${evt.start.replace('T', ' ')}${evt.location ? ' - ' + evt.location : ''}`,
                            link: './apps/calendar_local.html',
                            is_read: 0,
                            created_at: new Date().toISOString()
                        });
                    });
                }
            } catch (e) {
                console.error('[Schedule Notification Check Error]', e.message);
            }

            // 3. 반환 로직 통합 (DB 알람 + 가상 일정 알람)
            let list = db.prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`).all(user_id);
            list = [...virtualNotis, ...list];

            res.json({ result: 'success', list });
        }
        else if (action === 'mark_notification_read') {
            const { id } = req.body;
            db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`).run(id);
            res.json({ result: 'success' });
        }
        else if (action === 'delete_notification') {
            const { id } = req.body;
            db.prepare(`DELETE FROM notifications WHERE id = ?`).run(id);
            res.json({ result: 'success' });
        }
        else if (action === 'delete_read_notifications') {
            const { user_id } = req.body;
            db.prepare(`DELETE FROM notifications WHERE user_id = ? AND is_read = 1`).run(user_id);
            res.json({ result: 'success' });
        }
        else if (action === 'delete_notification_by_link') {
            const { user_id, doc_id } = req.body;
            db.prepare(`DELETE FROM notifications WHERE user_id = ? AND link LIKE ?`).run(user_id, `%${doc_id}%`);
            res.json({ result: 'success' });
        }

        // --- Error Report API ---
        else if (action === 'save_error_report') {
            const { author_id, author_name, category, urgency, title, content, attachments } = req.body;
            const id = `ERR_${Date.now()}`;
            const attachStr = attachments ? JSON.stringify(attachments) : '[]';
            
            db.prepare(`INSERT INTO error_reports (id, author_id, author_name, category, urgency, title, content, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, author_id, author_name, category || '기타', urgency || '보통', title, content, attachStr);
            
            // Notification dispatch removed as requested
            res.json({ result: 'success' });
        }
        else if (action === 'get_error_reports') {
            const list = db.prepare(`SELECT * FROM error_reports ORDER BY created_at DESC`).all();
            res.json({ result: 'success', list });
        }

        // ==========================================
        // [MDM] Database Management Actions
        // ==========================================
        else if (action === 'admin_get_table_data') {
            const { table } = req.body;
            const allowedTables = ['members', 'teams', 'doc_numbers', 'doc_numbers_jejeongnae', 'issued_docs_voucher', 'issued_docs_confirmation', 'issued_docs_reply_child', 'issued_docs_reply_adult', 'issued_docs_reply_suicide', 'issued_docs_reply_resignation', 'issued_docs_dis', 'issued_docs_jejungyeon', 'issued_docs_calc', 'issued_docs_lecture_conf', 'issued_docs_report', 'issued_docs_emergency', 'issued_docs_biz_trip', 'issued_docs_case_meeting', 'inquiries_child', 'inquiries_adult', 'inquiries_suicide', 'inquiries_resignation', 'user_tasks', 'work_logs', 'weekly_cases', 'daily_logs', 'notices', 'events', 'approvals', 'saved_lines'];
            if (!allowedTables.includes(table)) {
                return res.json({ result: 'error', message: '접근이 허용되지 않은 테이블입니다.' });
            }
            const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
            let orderBy = '';
            if (columns.includes('created_at')) orderBy = 'ORDER BY created_at DESC';
            else if (columns.includes('date')) orderBy = 'ORDER BY date DESC';

            let list = [];
            try {
                list = db.prepare(`SELECT * FROM ${table} ${orderBy} LIMIT 300`).all();
                res.json({ result: 'success', list, columns });
            } catch (err) {
                res.json({ result: 'error', message: err.message });
            }
        } else if (action === 'admin_delete_row') {
            const { table, id } = req.body;
            const allowedTables = ['members', 'teams', 'doc_numbers', 'doc_numbers_jejeongnae', 'issued_docs_voucher', 'issued_docs_confirmation', 'issued_docs_reply_child', 'issued_docs_reply_adult', 'issued_docs_reply_suicide', 'issued_docs_reply_resignation', 'issued_docs_dis', 'issued_docs_jejungyeon', 'issued_docs_calc', 'issued_docs_lecture_conf', 'issued_docs_report', 'issued_docs_emergency', 'issued_docs_biz_trip', 'issued_docs_case_meeting', 'inquiries_child', 'inquiries_adult', 'inquiries_suicide', 'inquiries_resignation', 'user_tasks', 'work_logs', 'weekly_cases', 'daily_logs', 'notices', 'events', 'approvals', 'saved_lines'];
            if (!allowedTables.includes(table)) return res.json({ result: 'error', message: '접근 금지된 테이블입니다.' });
            try {
                // Cascading logic for DB integrity
                if (table.startsWith('issued_docs_')) {
                    // Reset inquiries linked to this document
                    db.prepare(`UPDATE inquiries SET status = '대기', replyDate = '', docNum = '', issuedDocId = '' WHERE issuedDocId = ?`).run(id);
                } else if (table === 'doc_numbers') {
                    // Find docNum first
                    const docRec = db.prepare(`SELECT docNum FROM doc_numbers WHERE id = ?`).get(id);
                    if (docRec && docRec.docNum) {
                        db.prepare(`UPDATE inquiries SET status = '대기', replyDate = '', docNum = '', issuedDocId = '' WHERE docNum = ?`).run(docRec.docNum);
                    }
                }

                const pk = table === 'teams' ? 'code' : (table === 'doc_numbers' ? 'id' : 'id');
                db.prepare(`DELETE FROM ${table} WHERE ${pk} = ?`).run(id);
                res.json({ result: 'success' });
            } catch (err) {
                res.json({ result: 'error', message: err.message });
            }
        } else if (action === 'admin_update_row') {
            const { table, id, updateData } = req.body;
            const allowedTables = ['members', 'teams', 'doc_numbers', 'doc_numbers_jejeongnae', 'issued_docs_voucher', 'issued_docs_confirmation', 'issued_docs_reply_child', 'issued_docs_reply_adult', 'issued_docs_reply_suicide', 'issued_docs_reply_resignation', 'issued_docs_dis', 'issued_docs_jejungyeon', 'issued_docs_calc', 'issued_docs_lecture_conf', 'issued_docs_report', 'issued_docs_emergency', 'issued_docs_biz_trip', 'issued_docs_case_meeting', 'inquiries_child', 'inquiries_adult', 'inquiries_suicide', 'inquiries_resignation', 'user_tasks', 'work_logs', 'weekly_cases', 'daily_logs', 'notices', 'events', 'approvals', 'saved_lines'];
            if (!allowedTables.includes(table)) return res.json({ result: 'error', message: '접근 금지된 테이블입니다.' });
            try {
                const pk = table === 'teams' ? 'code' : 'id';
                const keys = Object.keys(updateData);
                const values = Object.values(updateData);

                if (keys.length === 0) return res.json({ result: 'error', message: '업데이트할 데이터가 없습니다.' });

                const setClause = keys.map(k => `${k} = ?`).join(', ');
                values.push(id);

                db.prepare(`UPDATE ${table} SET ${setClause} WHERE ${pk} = ?`).run(...values);
                res.json({ result: 'success' });
            } catch (err) {
                res.json({ result: 'error', message: err.message });
            }
        }

        else {
            res.json({ result: 'error', message: 'Unknown action: ' + action });
        }
    } catch (err) {
        console.error(`[API Error] Action: ${req.body?.action || 'none'}`, err);
        res.status(500).json({ result: 'error', message: err.message });
    }
});

// Generic Data Endpoint
app.post('/api/data', (req, res) => {
    res.status(501).json({ result: 'error', message: 'Not implemented yet' });
});

// ========== Legacy Excel Import API ==========
app.post('/api/import_legacy', uploadCirc.single('excelFile'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ result: 'error', message: 'No file uploaded.' });

        // 1. Read Excel File (raw: false converts internal dates to strings)
        const workbook = xlsx.readFile(req.file.path, { cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // raw: false ensures dates and formatted cells come out as formatted strings, dateNF defines date format
        const data = xlsx.utils.sheet_to_json(sheet, { raw: false, dateNF: 'yyyy-mm-dd' });

        // 2. Map and Insert based on 'docType' passed from frontend
        const docType = req.body.docType || '제정공'; // Default

        let stmtDoc = null;
        let stmtInq = null;

        let targetTable = 'doc_numbers';
        if (docType === '제정내') targetTable = 'doc_numbers_jejeongnae';
        if (docType === '제정연') targetTable = 'doc_numbers_jejeongyeon';

        if (docType === '제정내' || docType === '제정공' || docType === '제정연') {
            stmtDoc = db.prepare(`
                INSERT INTO ${targetTable} (docType, docNum, title, sender, target, date, sentDate, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
        } else if (['성인대장', '자살대장', '아동대장', '퇴원사실통보'].includes(docType)) {
            stmtInq = db.prepare(`
                INSERT INTO inquiries (
                    category, status, docNum, date, name, gender, birth,
                    agencyType, agencyDetail, agencyContact, reqType, reqReason,
                    address, contact, processContent, counselingContent, actionResult,
                    serviceMethod, progressStatus, provideDate, staffName, replyDate,
                    disease, agencyLoc, notifyDate
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
        }

        let successCount = 0;

        const insertAll = db.transaction((rows) => {
            rows.forEach((rawRow, idx) => {
                try {
                    // Normalize keys (remove whitespace) to prevent mismatch
                    const row = {};
                    for (let key in rawRow) {
                        row[key.trim()] = rawRow[key];
                    }

                    if (['제정내', '제정공', '제정연'].includes(docType)) {
                        let sentDate = '';
                        let status = '';

                        if (docType === '제정내') {
                            status = '완료';
                            stmtDoc.run(
                                '제정내',
                                String(row['문서번호'] || row['등록번호'] || row['docNum'] || row['docnum'] || ''),
                                String(row['제 목'] || row['제목'] || row['title'] || row['타이틀'] || row['Title'] || ''),
                                String(row['발 신 자'] || row['발신'] || row['발신자'] || row['기안자'] || row['sender'] || row['센더'] || row['Sender'] || ''),
                                String(row['수 신 자'] || row['구분'] || row['target'] || row['Target'] || ''), // target is used for '구분' (category) in 제정내
                                String(row['접수일자'] || row['작성일자'] || row['date'] || row['Date'] || ''),
                                '', // sentDate not used
                                status // 제정내는 발송이 필요 없으므로 '완료' 지정
                            );
                        } else if (docType === '제정공') {
                            sentDate = String(row['발신완료일'] || row['발송완료일'] || row['sentDate'] || row['sentdate'] || '');
                            status = sentDate ? '발송완료' : '미발송';
                            stmtDoc.run(
                                '제정공',
                                String(row['문서번호'] || row['등록번호'] || row['docNum'] || row['docnum'] || ''),
                                String(row['제 목'] || row['제목'] || row['title'] || row['타이틀'] || row['Title'] || ''),
                                String(row['발 신 자'] || row['발신'] || row['발신자'] || row['기안자'] || row['sender'] || row['센더'] || row['Sender'] || ''),
                                String(row['수 신 자'] || row['수신자'] || row['수신기관'] || row['target'] || row['Target'] || ''),
                                String(row['접수일자'] || row['작성일자'] || row['date'] || row['Date'] || ''),
                                sentDate,
                                status
                            );
                        } else if (docType === '제정연') {
                            // Assuming typical format for jejungyeon
                            sentDate = String(row['발송완료일'] || row['발신완료일'] || row['sentDate'] || row['sentdate'] || '');
                            status = sentDate ? '발송완료' : '미발송';
                            stmtDoc.run(
                                '제정연',
                                String(row['문서번호'] || row['등록번호'] || row['docNum'] || row['docnum'] || ''),
                                String(row['제 목'] || row['제목'] || row['title'] || row['타이틀'] || row['Title'] || ''),
                                String(row['발 신 자'] || row['발신'] || row['발신자'] || row['기안자'] || row['sender'] || row['센더'] || row['Sender'] || ''),
                                String(row['수 신 자'] || row['수신기관'] || row['수신자'] || row['target'] || row['Target'] || ''),
                                String(row['접수일자'] || row['작성일자'] || row['date'] || row['Date'] || ''),
                                sentDate,
                                status
                            );
                        }
                    } else if (['성인대장', '자살대장', '아동대장', '퇴원사실통보'].includes(docType)) {
                        let category = '';
                        if (docType === '성인대장') category = '성인';
                        else if (docType === '자살대장') category = '자살';
                        else if (docType === '아동대장') category = '아동';
                        else if (docType === '퇴원사실통보') category = '퇴원사실통보';

                        if (docType === '퇴원사실통보') {
                            stmtInq.run(
                                category,
                                String(row['상태'] || ''),
                                String(row['공문번호'] || ''),
                                String(row['접수일'] || row['접수일자'] || ''),
                                String(row['환자명'] || row['이름'] || ''),
                                '', // gender
                                '', // birth
                                '', // agencyType
                                String(row['통지기관'] || ''),
                                '', // agencyContact
                                '', // reqType
                                '', // reqReason
                                String(row['주소'] || ''),
                                String(row['연락처'] || ''),
                                '', // processContent
                                '', // counselingContent
                                String(row['조치내용 및 결과'] || row['조치결과'] || ''),
                                '', // serviceMethod
                                '', // progressStatus
                                '', // provideDate
                                String(row['담당자'] || row['담당자_1'] || ''),
                                String(row['회신일자'] || ''),
                                String(row['질환'] || ''),
                                String(row['발송기관소재지'] || ''),
                                String(row['통보일'] || '')
                            );
                        } else {
                            // 성인, 자살, 아동
                            stmtInq.run(
                                category,
                                String(row['상태'] || ''),
                                String(row['공문번호'] || ''),
                                String(row['의뢰접수일자'] || row['접수일자'] || ''),
                                String(row['대상자 성명'] || row['대상자성명'] || row['성명'] || row['이름'] || ''),
                                String(row['성별'] || ''),
                                String(row['생년월일'] || ''),
                                String(row['의뢰기관(구분)'] || row['의뢰기관 분류'] || ''),
                                String(row['세부기관명'] || row['의뢰기관'] || ''),
                                String(row['의뢰기관 담당자'] || row['의뢰기관담당자'] || row['담당자'] || ''),
                                String(row['의뢰구분'] || ''),
                                String(row['구체적사유'] || ''),
                                String(row['주소'] || ''),
                                String(row['연락처'] || ''),
                                String(row['의뢰과정'] || ''),
                                String(row['상담내용'] || ''),
                                String(row['조치결과'] || ''),
                                String(row['제공서비스'] || ''),
                                String(row['진행상황'] || ''),
                                String(row['제공일자'] || ''),
                                String(row['담당자_1'] || row['담당자_2'] || row['상담사'] || ''), // xlsx 2번째 중복이나 다른 이름이면 대채
                                String(row['회신일자'] || ''),
                                '', // disease
                                '', // agencyLoc
                                ''  // notifyDate
                            );
                        }
                    }
                    successCount++;
                } catch (rowErr) {
                    console.error('Row insert error:', rowErr);
                }
            });
        });

        insertAll(data);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({ result: 'success', imported: successCount });
    } catch (err) {
        console.error('[API Error] /import_legacy:', err);
        res.status(500).json({ result: 'error', message: err.message });
    }
});

// ========== Excel Export Trigger (Worker Thread) ==========
app.post('/api/export_excel', async (req, res) => {
    try {
        const { docType, yearMonth } = req.body;

        const isCaseLedger = ['성인대장', '자살대장', '아동대장', '퇴원사실통보'].includes(docType);

        // Target data fetch
        let query = "";
        const params = [];

        if (isCaseLedger) {
            query = "SELECT * FROM inquiries WHERE category = ?";
            params.push(docType);
            if (yearMonth) {
                query += " AND date LIKE ?";
                params.push(`${yearMonth}%`);
            }
            query += " ORDER BY date ASC, id ASC";
        } else {
            let targetTable = 'doc_numbers';
            if (docType === '제정내') targetTable = 'doc_numbers_jejeongnae';
            else if (docType === '제정연') targetTable = 'doc_numbers_jejeongyeon';

            query = `SELECT * FROM ${targetTable} WHERE docType = ?`;
            params.push(docType);
            if (yearMonth) {
                query += " AND date LIKE ?";
                params.push(`${yearMonth}%`);
            }
            query += " ORDER BY id ASC";
        }

        const targetData = db.prepare(query).all(...params);
        
        console.log(`[Export Excel Debug]`, {
            docType, targetTable: isCaseLedger ? 'inquiries' : (docType === '제정내' ? 'doc_numbers_jejeongnae' : 'doc_numbers'),
            query, params,
            resultCount: targetData.length
        });

        if (targetData.length === 0) {
            return res.json({ result: 'error', message: '데이터가 없습니다.' });
        }

        // Spin up the worker wrapped in a Promise to wait for completion
        const workerResult = await new Promise((resolve, reject) => {
            const worker = new Worker(path.join(__dirname, 'workers', 'excel_exporter.js'), {
                workerData: { targetData, docType }
            });

            worker.on('message', (msg) => {
                if (msg.status === 'done') {
                    resolve(msg.file);
                } else if (msg.status === 'error') {
                    reject(new Error(msg.error));
                }
            });

            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
            });
        });

        // Return the file path to FE once done
        res.json({ result: 'success', message: '엑셀 생성이 완료되었습니다.', targetCount: targetData.length, file: workerResult });

    } catch (err) {
        res.status(500).json({ result: 'error', message: err.message });
    }
});

// Global Error Handler for JSON parsing or other middleware errors
app.use((err, req, res, next) => {
    console.error('[Global Error]', err);
    res.status(err.status || 500).json({
        result: 'error',
        message: err.message || 'Internal Server Error'
    });
});

// --- TEMPORARY FIX FOR ORPHANED APPROVALS ---
app.get('/api/fix_db', (req, res) => {
    try {
        const docs = db.prepare("SELECT * FROM approvals WHERE type='CASE_CONFERENCE'").all();
        let fixedCount = 0;
        for (const doc of docs) {
            const content = JSON.parse(doc.content);
            if (content.reportData && !content.linkedDocId) {
                const datePrefix = new Date(doc.created_at || Date.now()).toISOString().slice(0, 10).replace(/\-/g, '');
                const randomSuffix = Math.floor(Math.random() * 900000) + 100000;
                const id = 'CMT-' + datePrefix + '-' + randomSuffix;
                let target_name = content.reportData.v_manager || '담당자';
                let issuer = content.reportData.issuer || '이보람';
                db.prepare("INSERT INTO issued_docs_case_meeting (id, type, target_name, content_json, issuer, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, '사례회의록', target_name, JSON.stringify(content.reportData), issuer, doc.created_at || new Date().toISOString(), doc.status);
                content.linkedDocId = id;
                db.prepare("UPDATE approvals SET content = ? WHERE id = ?").run(JSON.stringify(content), doc.id);
                console.log('Fixed missing linkedDocId for:', doc.id, '->', id);
                fixedCount++;
            }
        }
        res.send(`Fixed ${fixedCount} orphaned approvals.`);
    } catch(e) {
        console.error('Fix error:', e.message);
        res.status(500).send(`Error: ${e.message}`);
    }
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Access from other PCs via: http://[YOUR-IP]:${port}`);
});
