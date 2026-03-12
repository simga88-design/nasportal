const db = require('./db.js');

try {
    const events = db.prepare('SELECT id, title, start, end, isAllday, rrule FROM events').all();
    console.log(`Checking ${events.length} events...`);
    let updated = 0;
    
    events.forEach(evt => {
        let needsUpdate = false;
        let newStart = evt.start;
        let newEnd = evt.end;
        let newRrule = evt.rrule;
        
        if (newStart && newStart.endsWith('Z')) {
            newStart = newStart.slice(0, -1);
            needsUpdate = true;
        }
        
        if (newEnd && newEnd.endsWith('Z')) {
            newEnd = newEnd.slice(0, -1);
            needsUpdate = true;
        }

        if (newRrule && newRrule.endsWith('Z')) {
            newRrule = newRrule.slice(0, -1);
            needsUpdate = true;
        }

        if (needsUpdate) {
            db.prepare('UPDATE events SET start = ?, end = ?, rrule = ? WHERE id = ?').run(newStart, newEnd, newRrule, evt.id);
            updated++;
            console.log(`Updated event: ${evt.title} (${evt.id})`);
        }
    });

    console.log(`Successfully fixed timezone formatting for ${updated} events.`);
} catch (e) {
    console.error(e);
}
