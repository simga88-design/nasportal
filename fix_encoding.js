const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const rootDir = __dirname;

function fixEncodingRecursive(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        if (['node_modules', '.git', '.gemini', 'db'].includes(file)) continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            fixEncodingRecursive(fullPath);
        } else if (fullPath.toLowerCase().endsWith('.html') || fullPath.toLowerCase().endsWith('.htm') || fullPath.toLowerCase().endsWith('.js')) {
            try {
                const buf = fs.readFileSync(fullPath);

                // Read as UTF-8 first
                const utf8Str = buf.toString('utf8');

                // If the UTF-8 string contains the replacement character () or 'euc-kr' specific corruptions 
                // when we expect HTML/Korean, it's highly likely corrupted by EUC-KR.
                if (utf8Str.includes('\uFFFD')) {
                    console.log(`[FIXING] ${fullPath}`);
                    const fixedStr = iconv.decode(buf, 'euc-kr');
                    fs.writeFileSync(fullPath, fixedStr, 'utf8');
                    console.log(`  -> Restored to UTF-8`);
                } else {
                    console.log(`[SKIP] ${fullPath} is already valid UTF-8`);
                }
            } catch (err) {
                console.error(`[ERROR] Processing ${fullPath}:`, err);
            }
        }
    }
}

console.log('Starting Encoding Fixer...');
fixEncodingRecursive(rootDir);
console.log('Finished Encoding Fixer.');
