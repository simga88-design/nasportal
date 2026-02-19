const db = require('../db');

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

module.exports = {
    sendInternalNotification
};
