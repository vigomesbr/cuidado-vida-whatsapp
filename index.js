const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');
const qrcode = require('qrcode');

const app = express();

// Inicializar cliente do WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
});

// Variáveis de controle
let qrCodeUrl = null;
let isClientReady = false;

// Middleware de CORS para permitir acessos do frontend
const allowedOrigins = ['https://cuidado-vida.web.app', 'http://localhost:3000'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error('Não permitido pela política de CORS'));
    },
}));

// Middleware para analisar requisições JSON
app.use(express.json());

// Evento para capturar e gerar QR Code
client.on('qr', (qr) => {
    console.log('QR Code recebido:', qr);
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Erro ao gerar QR Code:', err);
            return;
        }
        qrCodeUrl = url;
    });
});

// Evento de cliente pronto
client.on('ready', () => {
    console.log('WhatsApp client está pronto!');
    isClientReady = true;
});

// Evento de falha na autenticação
client.on('auth_failure', (message) => {
    console.error('Falha na autenticação:', message);
    qrCodeUrl = null; // Resetar o QR Code caso ocorra falha
    isClientReady = false;
});

// Inicializar o cliente do WhatsApp
client.initialize();

// Endpoint para obter o QR Code
app.get('/qr-code', (req, res) => {
    if (!qrCodeUrl) {
        return res.status(400).json({ error: 'QR Code não gerado ainda!' });
    }
    res.json({ qrCodeUrl });
});

// Endpoint para enviar mensagens via WhatsApp
app.post('/send-message', async (req, res) => {
    if (!isClientReady) {
        return res.status(503).json({ error: 'WhatsApp client não está pronto!' });
    }

    const { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).json({ error: 'Número e mensagem são obrigatórios!' });
    }

    try {
        const chatId = `${number}@c.us`;
        await client.sendMessage(chatId, message);
        res.status(200).json({ status: 'Mensagem enviada!' });
    } catch (err) {
        console.error('Erro ao enviar mensagem:', err);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

// Definir a porta para o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
