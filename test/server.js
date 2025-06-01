/*
SUPER SIMPLE JANK TEST SERVER, DO NOT USE FOR ANYTHING OTHER THAN LOCAL TESTING
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Utility to get content type by file extension
function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.md': 'text/markdown',
    }[ext] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
    let filePath;

    if (req.url === '/' || req.url === '/index.html') {
        filePath = path.join(__dirname, '..', 'index.html');
    }

    else if (req.url === '/styles.css') {
        filePath = path.join(__dirname, '..', 'styles.css');
    }

    else if (req.url === '/script.js') {
        filePath = path.join(__dirname, '..', 'script.js');
    }

    // /page → page.html
    else if (/^\/[a-zA-Z0-9_-]+$/.test(req.url)) {
        const page = req.url.slice(1);
        filePath = path.join(__dirname, '..', `${page}.html`);
    }

    else if (/^\/[a-zA-Z0-9_-]+\.html$/.test(req.url)) {
        const page = req.url.slice(1);
        filePath = path.join(__dirname, '..', `${page}`);
    }

    // /content/*.md or /releases/*.md
    else if (req.url.startsWith('/content/') || req.url.startsWith('/releases/')) {
        filePath = path.join(__dirname, '..', req.url);
    }

    // /uploads/img/* or /images/img/*
    else if (req.url.startsWith('/uploads/') || req.url.startsWith('/images/')) {
        filePath = path.join(__dirname, '..', req.url);
    }

    // 404 fallback
    else {
        res.writeHead(404);
        return res.end('Not Found');
    }

    // Serve the file
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            const contentType = getContentType(filePath);
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://192.168.1.179:${PORT}`);
});
