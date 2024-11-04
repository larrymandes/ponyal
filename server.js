const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;


const upload = multer({ dest: 'audio/' });

const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', ws => {
    console.log('Клиент подключился');

    ws.on('message', message => {
        console.log(`Получено сообщение: ${message}`);
    });
});


app.use(express.static(path.join(__dirname, 'public')));
app.use('/audio', express.static('audio'));


app.use(express.json()); // Добавьте эту строку
app.use(express.urlencoded({ extended: true })); // Эта строка для обработки URL-кодированных данных, если это необходимо


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.get('/send', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'send.html'));
});


app.post('/upload', upload.single('audioFile'), (req, res) => {
    if (req.file) {
        const audioUrl = `http://localhost:${PORT}/audio/${req.file.filename}`;
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(audioUrl);
            }
        });
        res.status(200).send('Файл загружен');
    } else {
        res.status(400).send('Ошибка загрузки файла');
    }
});


app.use((err, req, res, next) => {
    console.error(err); 
    res.status(500).send('Внутренняя ошибка сервера');
});

app.post('/delete-audio', (req, res) => {
    const { audioUrl } = req.body; // Получаем URL аудиофайла из тела запроса
    const fileName = audioUrl.split('/').pop(); // Получаем имя файла из URL
    const filePath = path.join(__dirname, 'audio', fileName); // Полный путь к файлу

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Ошибка при удалении файла:', err);
            return res.status(500).send('Ошибка при удалении файла');
        }
        console.log('Файл успешно удалён:', fileName);
        res.status(200).send('Файл успешно удалён');
    });
});


const server = app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, ws => {
        wss.emit('connection', ws, request);
    });
});
