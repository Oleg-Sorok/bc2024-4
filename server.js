const http = require('http');
const { program } = require('commander');
const fs = require('fs').promises;
const path = require('path');
const superagent = require('superagent');

// Налаштування командного рядка
program
  .requiredOption('-H, --host <host>', 'server host')
  .requiredOption('-p, --port <port>', 'server port')
  .requiredOption('-c, --cache <path>', 'cache directory path')
  .parse(process.argv);

const { host, port, cache } = program.opts();

// Створення вебсервера
const server = http.createServer(async (req, res) => {
  const code = req.url.slice(1); // Отримуємо код HTTP з URL (без '/')
  const filePath = path.join(".cache", `${code}.jpg`);

  if (req.method === 'GET') {
    try {
      const fileData = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(fileData);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Якщо файлу немає, виконуємо запит на http.cat
        try {
          const catResponse = await superagent.get(`https://http.cat/${code}`);
          const imageBuffer = catResponse.body;

          // Зберігаємо отримане зображення у кеш
          await fs.writeFile(filePath, imageBuffer);
          
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(imageBuffer);
        } catch (catError) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('File not found');
        }
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server error');
      }
    }
  } else if (req.method === 'PUT') {
    let data = [];
    req.on('data', chunk => {
      data.push(chunk);
    });
    req.on('end', async () => {
      const buffer = Buffer.concat(data);
      try {
        await fs.writeFile(filePath, buffer);
        res.writeHead(201, { 'Content-Type': 'text/plain' });
        res.end('File created/updated');
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server error');
      }
    });
  } else if (req.method === 'DELETE') {
    try {
      await fs.unlink(filePath);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('File deleted');
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server error');
      }
    }
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method not allowed');
  }
});

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
  console.log(`Cache directory is set to: ${cache}`);
});
