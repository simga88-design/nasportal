const db = require('./db.js');
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='error_reports'").get());
