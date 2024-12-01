const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');
const qrcode = require('qrcode');

const app = express();

// Variáveis globais
let client = null;
let qrCodeUrl = null;

// Middleware para permitir CORS
app.use(cors({
    origin: 'https://cuidado-vida.web.app',  // Ajuste conforme necessário
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// Função para inicializar o cliente apenas quando necessário
const initializeClient = () => {
    if (client) return; // Evita a reinicialização do cliente

    client = new Client({
        authStrategy: new LocalAuth(),
    });

    client.on('qr', (qr) => {
        qrcode.toDataURL(qr, (err, url) => {
            if (err) {
                console.error('Erro ao gerar QR Code', err);
                return;
            }
            qrCodeUrl = url;  // Armazenar QR Code gerado
        });
    });

    client.on('ready', () => {
        console.log('WhatsApp client está pronto!');
    });

    client.initialize();
};

// Endpoint para obter o QR Code
app.get('/qr-code', (req, res) => {
    initializeClient();  // Inicializa o cliente apenas se necessário
    if (!qrCodeUrl) {
        return res.status(400).json({ error: 'QR Code não gerado ainda!' });
    }
    res.json({ qrCodeUrl });
});

// Endpoint para enviar mensagens via WhatsApp
app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) {
        return res.status(400).send({ error: 'Número e mensagem são obrigatórios.' });
    }

    try {
        initializeClient();  // Garante que o cliente esteja inicializado
        const chatId = `${number}@c.us`;
        await client.sendMessage(chatId, message);
        res.status(200).send({ status: 'Mensagem enviada!' });
    } catch (err) {
        console.error('Erro ao enviar mensagem:', err);
        res.status(500).send({ error: 'Erro ao enviar mensagem' });
    }
});

// Definindo a porta para o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
