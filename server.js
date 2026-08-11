/**
 * IPTV PRO - Standalone HTTP Server
 * Requires ZERO external dependencies. Bu faylni boshqarish uchun faqat Node.js kerak.
 * Run with: node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.m3u': 'audio/mpegurl',
    '.m3u8': 'application/vnd.apple.mpegurl'
};

const server = http.createServer((request, response) => {
    console.log(`>> So'rov keldi: ${request.url}`);

    // Decode URL to prevent %2e%2e or other traversal representations
    let safeUrl;
    try {
        safeUrl = decodeURIComponent(request.url);
    } catch (e) {
        safeUrl = request.url;
    }

    // Clean query parameters
    safeUrl = safeUrl.split('?')[0];

    // Safe path resolution
    const rootPath = path.resolve(__dirname || '.');
    let filePath = path.join(rootPath, safeUrl);

    // If path is root or trailing slash, default to index.html
    if (filePath === rootPath || filePath === rootPath + path.sep) {
        filePath = path.join(rootPath, 'index.html');
    }

    // Path Traversal Security check: verify file is within project root
    if (!filePath.startsWith(rootPath)) {
        response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('403 - Kirish taqiqlangan (Path Traversal himoyasi)');
        return;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code === 'ENOENT') {
                response.writeHead(404, { 'Content-Type': 'text/html' });
                response.end('<h1>404 - Fayl topilmadi</h1><p>IPTV PRO tizimi: Ushbu manzil mavjud emas.</p>', 'utf-8');
            } else {
                response.writeHead(500);
                response.end('Server xatosi: '+error.code+' ..\n');
            }
        } else {
            // CORS ruxsatnomalari - Global ruxsat
            response.writeHead(200, { 
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            });
            response.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=========================================`);
    console.log(`🚀 IPTV PRO Server muvaffaqiyatli ishga tushdi!`);
    console.log(`=========================================`);
    console.log(`\nShu kompyuterdan kirish uchun: \n👉 http://localhost:${PORT}`);
    console.log(`\nUbuntu Server tarmoqdan (Global) kirish uchun IP manzilingiz orqali: \n👉 http://<SERVER_IP>:${PORT}\n`);
    console.log(`To'xtatish uchun: CTRL + C bosing.`);
});
