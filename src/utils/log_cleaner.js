const fs = require('fs/promises');
const path = require('path');
const schedule = require('node-schedule');

const LOGS_DIR = path.join(__dirname, '../../logs');
const MAX_AGE_DAYS = 3;

async function cleanOldLogs() {
    try {
        const files = await fs.readdir(LOGS_DIR);

        const now = Date.now();
        const cutoff = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

        for (const file of files) {
            if (!file.endsWith('.txt')) continue;

            // filename format: controllerName_YYYY-MM-DD.txt
            const match = file.match(/(\d{4}-\d{2}-\d{2})\.txt$/);
            if (!match) continue;

            const fileDate = new Date(match[1]).getTime();
            if (now - fileDate > cutoff) {
                await fs.unlink(path.join(LOGS_DIR, file));
                console.log(`[log_cleaner] Deleted old log: ${file}`);
            }
        }
    } catch (err) {
        console.error('[log_cleaner] Error during cleanup:', err.message);
    }
}

// runs every day at midnight
function startLogCleaner() {
    schedule.scheduleJob('0 0 * * *', cleanOldLogs);
    console.log('[log_cleaner] Scheduled daily log cleanup (files older than 3 days)');
}

module.exports = startLogCleaner;
