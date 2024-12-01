const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Caminho para os dados locais de autenticação
const authPath = path.join(__dirname, '.wwebjs_auth');

// Limpa dados antigos ao iniciar a aplicação
if (fs.existsSync(authPath)) {
    try {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log('Sessão antiga removida com sucesso.');
    } catch (err) {
        console.error('Erro ao remover a sessão antiga:', err);
    }
}

// Inicializa o cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: authPath,
    }),
});

// Variável para armazenar o QR Code
let qrCodeUrl = null;

// Variável para indicar o estado do cliente
let isClientReady = false;

// Middleware para permitir CORS
app.use(cors({
    origin: ['https://cuidado-vida.web.app', 'http://localhost:3000'], // Substitua pelas URLs permitidas
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

// Middleware para analisar JSON no corpo das requisições
app.use(express.json());

// Evento: QR Code gerado
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

// Evento: Cliente pronto
client.on('ready', () => {
    console.log('WhatsApp client está pronto!');
    isClientReady = true;
});

// Evento: Falha de autenticação
client.on('auth_failure', (message) => {
    console.error('Falha na autenticação:', message);
    qrCodeUrl = null;
    isClientReady = false;
});

// Inicializa o cliente WhatsApp
client.initialize().catch((err) => {
    console.error('Erro ao inicializar o cliente WhatsApp:', err);
});

// Endpoint: Obter QR Code
app.get('/qr-code', (req, res) => {
    if (!qrCodeUrl) {
        return res.status(400).json({ error: 'QR Code ainda não gerado. Tente novamente em alguns segundos.' });
    }
    res.json({ qrCodeUrl });
});

// Endpoint: Enviar mensagem pelo WhatsApp
app.post('/send-message', async (req, res) => {
    if (!isClientReady) {
        return res.status(503).json({ error: 'WhatsApp client não está pronto. Por favor, aguarde.' });
    }

    const { number, message } = req.body;

    try {
        const chatId = `${number}@c.us`;
        await client.sendMessage(chatId, message);
        res.status(200).json({ status: 'Mensagem enviada com sucesso!' });
    } catch (err) {
        console.error('Erro ao enviar mensagem:', err);
        res.status(500).json({ error: 'Erro ao enviar mensagem. Verifique os logs do servidor.' });
    }
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
