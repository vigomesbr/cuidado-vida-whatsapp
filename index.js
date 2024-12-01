const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();

// Caminho persistente para autenticação
const authPath = path.join('/opt/render/project/src', '.wwebjs_auth');

// Limpar cache do WhatsApp (se necessário)
const cachePath = path.join(authPath, 'session', 'Default', 'Cache', 'Cache_Data');
if (fs.existsSync(cachePath)) {
    try {
        fs.rmSync(cachePath, { recursive: true, force: true });
        console.log('Cache do WhatsApp limpo.');
    } catch (err) {
        console.error('Erro ao limpar o cache:', err);
    }
}

// Inicializar cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: authPath,
    }),
});

let qrCodeUrl = null;
let isClientReady = false;

// Middleware CORS
app.use(cors({
    origin: ['https://cuidado-vida.web.app', 'http://localhost:3000'],
}));

app.use(express.json());

// Capturar QR Code
client.on('qr', (qr) => {
    console.log('QR Code recebido.');
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Erro ao gerar QR Code:', err);
            return;
        }
        qrCodeUrl = url;
    });
});

// Cliente pronto
client.on('ready', () => {
    console.log('WhatsApp client está pronto!');
    isClientReady = true;
});

// Falha na autenticação
client.on('auth_failure', (message) => {
    console.error('Falha na autenticação:', message);
    qrCodeUrl = null;
    isClientReady = false;
});

// Inicializar o cliente com atraso (opcional)
setTimeout(() => {
    client.initialize().catch((error) => {
        console.error('Erro ao inicializar o cliente:', error);
    });
}, 5000);

// Endpoints
app.get('/qr-code', (req, res) => {
    if (!qrCodeUrl) {
        return res.status(400).json({ error: 'QR Code não gerado ainda!' });
    }
    res.json({ qrCodeUrl });
});

app.post('/send-message', async (req, res) => {
    if (!isClientReady) {
        return res.status(503).json({ error: 'WhatsApp client não está pronto!' });
    }

    const { number, message } = req.body;
    try {
        const chatId = `${number}@c.us`;
        await client.sendMessage(chatId, message);
        res.status(200).json({ status: 'Mensagem enviada!' });
    } catch (err) {
        console.error('Erro ao enviar mensagem:', err);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

// Porta do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
