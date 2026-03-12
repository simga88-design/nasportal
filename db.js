const Database = require('better-sqlite3');
const db = new Database('./db/portal.sqlite');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    password TEXT,
    name TEXT,
    email TEXT,
    role TEXT,
    team TEXT,
    position TEXT,
    phone TEXT,
    permission_level INTEGER DEFAULT 1,
    avatar TEXT,
    stamp TEXT,
    status TEXT,
    joinDate TEXT,
    isSystemAdmin INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS teams (
    code TEXT PRIMARY KEY,
    name TEXT,
    leader TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS notices (
    id TEXT PRIMARY KEY,
    type TEXT,
    title TEXT,
    content TEXT,
    isPinned INTEGER DEFAULT 0,
    author TEXT,
    date TEXT,
    viewCount INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT,
    start TEXT,
    end TEXT,
    isAllday INTEGER DEFAULT 0,
    category TEXT,
    location TEXT,
    body TEXT,
    calendarId TEXT,
    class TEXT,
    state TEXT,
    raw TEXT,
    groupId TEXT,
    rrule TEXT
  );

  -- [신규] 문서 발급 대장 (개별 테이블로 분할됨)
  CREATE TABLE IF NOT EXISTS issued_docs(
    id TEXT PRIMARY KEY,
    type TEXT,
    target_name TEXT,
    content_json TEXT,
    issuer TEXT,
    created_at TEXT,
    status TEXT DEFAULT '발급 완료'
  );

  CREATE TABLE IF NOT EXISTS issued_docs_voucher (id TEXT PRIMARY KEY, type TEXT, target_name TEXT, content_json TEXT, issuer TEXT, created_at TEXT, status TEXT DEFAULT '발급 완료');
  CREATE TABLE IF NOT EXISTS issued_docs_confirmation (id TEXT PRIMARY KEY, type TEXT, target_name TEXT, content_json TEXT, issuer TEXT, created_at TEXT, status TEXT DEFAULT '발급 완료');
  CREATE TABLE IF NOT EXISTS issued_docs_reply_letter (id TEXT PRIMARY KEY, type TEXT, target_name TEXT, content_json TEXT, issuer TEXT, created_at TEXT, status TEXT DEFAULT '발급 완료');
  CREATE TABLE IF NOT EXISTS issued_docs_dis (id TEXT PRIMARY KEY, type TEXT, target_name TEXT, content_json TEXT, issuer TEXT, created_at TEXT, status TEXT DEFAULT '발급 완료');
  CREATE TABLE IF NOT EXISTS issued_docs_jejungyeon (id TEXT PRIMARY KEY, type TEXT, target_name TEXT, content_json TEXT, issuer TEXT, created_at TEXT, status TEXT DEFAULT '발급 완료');
  CREATE TABLE IF NOT EXISTS issued_docs_calc (id TEXT PRIMARY KEY, type TEXT, target_name TEXT, content_json TEXT, issuer TEXT, created_at TEXT, status TEXT DEFAULT '발급 완료');
  CREATE TABLE IF NOT EXISTS issued_docs_lecture_conf (id TEXT PRIMARY KEY, type TEXT, target_name TEXT, content_json TEXT, issuer TEXT, created_at TEXT, status TEXT DEFAULT '발급 완료');
  CREATE TABLE IF NOT EXISTS issued_docs_report (id TEXT PRIMARY KEY, type TEXT, target_name TEXT, content_json TEXT, issuer TEXT, created_at TEXT, status TEXT DEFAULT '발급 완료');
  CREATE TABLE IF NOT EXISTS issued_docs_emergency (id TEXT PRIMARY KEY, type TEXT, target_name TEXT, content_json TEXT, issuer TEXT, created_at TEXT, status TEXT DEFAULT '발급 완료');
  CREATE TABLE IF NOT EXISTS issued_docs_biz_trip (id TEXT PRIMARY KEY, type TEXT, target_name TEXT, content_json TEXT, issuer TEXT, created_at TEXT, status TEXT DEFAULT '발급 완료');
  CREATE TABLE IF NOT EXISTS issued_docs_case_meeting (id TEXT PRIMARY KEY, type TEXT, target_name TEXT, content_json TEXT, issuer TEXT, created_at TEXT, status TEXT DEFAULT '발급 완료');


  -- [신규주간보고] 트랙 A: 행정/사업 업무 누적용
  CREATE TABLE IF NOT EXISTS master_categories (
    id TEXT PRIMARY KEY,
    category_name TEXT
  );

  CREATE TABLE IF NOT EXISTS user_tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    category_id TEXT,
    task_name TEXT,
    is_active INTEGER DEFAULT 1,
    target_goal INTEGER DEFAULT 0,
    target_goal_2 INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS work_logs (
    id TEXT PRIMARY KEY,
    user_task_id TEXT,
    work_date TEXT,
    status TEXT DEFAULT '대기',
    isp_count INTEGER DEFAULT 0,
    isp_count_2 INTEGER DEFAULT 0,
    memo TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- [신규주간보고] 트랙 B: 주간회의 특이사례 보고용
  CREATE TABLE IF NOT EXISTS weekly_cases (
    id TEXT PRIMARY KEY,
    report_week TEXT,
    category TEXT,
    client_name TEXT,
    gender_age TEXT,
    referral_path TEXT,
    chief_complaint TEXT,
    scale_score TEXT,
    scale_score_2 TEXT,
    action_result TEXT,
    intervention_date TEXT,
    manager_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS daily_logs (
    id TEXT PRIMARY KEY,
    date TEXT,
    plan TEXT,
    note TEXT,
    writerEmail TEXT,
    writerName TEXT,
    writerTeam TEXT,
    status INTEGER DEFAULT 1,
    rejectReason TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS doc_numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docNum TEXT UNIQUE,
    docType TEXT,
    title TEXT,
    sender TEXT,
    target TEXT,
    date TEXT,
    sentDate TEXT,
    status TEXT DEFAULT '미발송'
  );

  -- [신규] 제정내, 제정연 전용 대장 분리
  CREATE TABLE IF NOT EXISTS doc_numbers_jejeongnae (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docNum TEXT UNIQUE,
    docType TEXT,
    title TEXT,
    sender TEXT,
    target TEXT,
    date TEXT,
    status TEXT DEFAULT '완료'
  );

  CREATE TABLE IF NOT EXISTS doc_numbers_jejeongyeon (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docNum TEXT UNIQUE,
    docType TEXT,
    title TEXT,
    sender TEXT,
    target TEXT,
    date TEXT,
    sentDate TEXT,
    status TEXT DEFAULT '미발송'
  );

  CREATE TABLE IF NOT EXISTS fix_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docNumber TEXT,
    content TEXT,
    requester TEXT,
    status TEXT DEFAULT '대기',
    date TEXT,
    completedDate TEXT
  );

  CREATE TABLE IF NOT EXISTS circulation (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    author TEXT,
    date TEXT,
    mainFile TEXT,
    attachments TEXT,
    readers TEXT
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY,
    drafter TEXT,
    date TEXT,
    title TEXT,
    content TEXT,
    team TEXT,
    status TEXT,
    answer TEXT,
    answerDate TEXT,
    answerer TEXT
  );

  -- E-Approval Tables
  CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    drafter_id TEXT,
    title TEXT,
    type TEXT,
    content TEXT,
    status TEXT,
    current_step INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS approval_lines (
    approval_id TEXT,
    step_order INTEGER,
    approver_id TEXT,
    approver_name TEXT,
    status TEXT,
    comment TEXT,
    acted_at DATETIME,
    PRIMARY KEY (approval_id, step_order)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT,
    title TEXT,
    message TEXT,
    link TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS saved_lines (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT,
    lines TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS case_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS error_reports (
    id TEXT PRIMARY KEY,
    author_id TEXT,
    author_name TEXT,
    category TEXT,
    urgency TEXT,
    title TEXT,
    content TEXT,
    attachments TEXT,
    status TEXT DEFAULT '대기',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- Migrations for existing tables ---
try {
    const errorLogCols = db.prepare('PRAGMA table_info(error_reports)').all().map(c => c.name);
    if (!errorLogCols.includes('category')) db.exec('ALTER TABLE error_reports ADD COLUMN category TEXT');
    if (!errorLogCols.includes('urgency')) db.exec('ALTER TABLE error_reports ADD COLUMN urgency TEXT');
    if (!errorLogCols.includes('attachments')) db.exec('ALTER TABLE error_reports ADD COLUMN attachments TEXT');
    const columns = db.prepare('PRAGMA table_info(members)').all().map(c => c.name);
    if (!columns.includes('position')) db.exec('ALTER TABLE members ADD COLUMN position TEXT');
    if (!columns.includes('phone')) db.exec('ALTER TABLE members ADD COLUMN phone TEXT');
    if (!columns.includes('permission_level')) db.exec('ALTER TABLE members ADD COLUMN permission_level INTEGER DEFAULT 1');
    if (!columns.includes('avatar')) db.exec('ALTER TABLE members ADD COLUMN avatar TEXT');
    if (!columns.includes('stamp')) db.exec('ALTER TABLE members ADD COLUMN stamp TEXT');
    if (!columns.includes('isCirculationAdmin')) db.exec('ALTER TABLE members ADD COLUMN isCirculationAdmin INTEGER DEFAULT 0');

    const noticeCols = db.prepare('PRAGMA table_info(notices)').all().map(c => c.name);
    if (!noticeCols.includes('files')) db.exec('ALTER TABLE notices ADD COLUMN files TEXT');

    // Dual Goals Migrations
    const utCols = db.prepare('PRAGMA table_info(user_tasks)').all().map(c => c.name);
    if (!utCols.includes('target_goal_2')) db.exec('ALTER TABLE user_tasks ADD COLUMN target_goal_2 INTEGER DEFAULT 0');

    const wlCols = db.prepare('PRAGMA table_info(work_logs)').all().map(c => c.name);
    if (!wlCols.includes('isp_count_2')) db.exec('ALTER TABLE work_logs ADD COLUMN isp_count_2 INTEGER DEFAULT 0');

    const inqCols = db.prepare('PRAGMA table_info(inquiries)').all().map(c => c.name);
    if (!inqCols.includes('provideDate')) db.exec('ALTER TABLE inquiries ADD COLUMN provideDate TEXT');
    if (!inqCols.includes('issuedDocId')) db.exec('ALTER TABLE inquiries ADD COLUMN issuedDocId TEXT');
    if (!inqCols.includes('admissionDate')) db.exec('ALTER TABLE inquiries ADD COLUMN admissionDate TEXT');
    if (!inqCols.includes('dischargeDate')) db.exec('ALTER TABLE inquiries ADD COLUMN dischargeDate TEXT');

    // DB 분리 마이그레이션: 기존 doc_numbers 에 있는 제정내, 제정연을 신규 테이블로 이전하고 기존에서 삭제
    db.exec(`
      INSERT OR IGNORE INTO doc_numbers_jejeongnae (docNum, docType, title, sender, target, date, status)
      SELECT docNum, docType, title, sender, target, date, '완료' FROM doc_numbers WHERE docType = '제정내';
      
      INSERT OR IGNORE INTO doc_numbers_jejeongyeon (docNum, docType, title, sender, target, date, sentDate, status)
      SELECT docNum, docType, title, sender, target, date, sentDate, status FROM doc_numbers WHERE docType = '제정연';

      DELETE FROM doc_numbers WHERE docType IN ('제정내', '제정연');
    `);

    // 제정내 sentDate 컬럼 삭제
    const jnCols = db.prepare('PRAGMA table_info(doc_numbers_jejeongnae)').all().map(c => c.name);
    if (jnCols.includes('sentDate')) {
        db.exec('ALTER TABLE doc_numbers_jejeongnae DROP COLUMN sentDate');
    }

    // issued_docs 개별 테이블 분할 마이그레이션
    const docTypesMap = {
        'voucher': 'issued_docs_voucher',
        'confirmation': 'issued_docs_confirmation',
        'reply_letter': 'issued_docs_reply_letter',
        '퇴사통회신서발행기': 'issued_docs_dis',
        'jejungyeon': 'issued_docs_jejungyeon',
        '강사비산출내역서': 'issued_docs_calc',
        '강의확인서': 'issued_docs_lecture_conf',
        '사례종결보고서-2026년': 'issued_docs_report',
        '응급개입 기록지(수정본)': 'issued_docs_emergency',
        '출장복명서': 'issued_docs_biz_trip',
        '사례회의록': 'issued_docs_case_meeting'
    };

    const existingDocs = db.prepare('SELECT COUNT(*) as count FROM issued_docs').get();
    if (existingDocs.count > 0) {
        for (const [type, tableName] of Object.entries(docTypesMap)) {
            db.prepare(`
                INSERT OR IGNORE INTO ${tableName} (id, type, target_name, content_json, issuer, created_at, status)
                SELECT id, type, target_name, content_json, issuer, created_at, status 
                FROM issued_docs WHERE type = ?
            `).run(type);
        }
        // 원본 테이블 내용 비우기 (데이터 보존을 위해 DROP하지 않고 비움처리)
        db.exec('DELETE FROM issued_docs');
    }

    console.log('Database migrations applied successfully');
} catch (e) {
    console.warn('Migration error (likely columns already exist):', e.message);
}
console.log('Database initialized successfully (SQLite)');

module.exports = db;
