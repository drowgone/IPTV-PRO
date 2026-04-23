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

    let filePath = '.' + request.url;
    if (filePath === './') {
        filePath = './index.html';
    } else {
        // Parametrlarni tozalash (masalan: ?stream=url)
        filePath = filePath.split('?')[0];
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
