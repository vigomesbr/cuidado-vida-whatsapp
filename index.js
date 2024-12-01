const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');
const qrcode = require('qrcode');

const app = express();
let client; // Declare client outside to initialize lazily

// Middleware para permitir CORS
app.use(cors({
    origin: 'https://cuidado-vida.web.app', // Substitua pela URL do seu frontend hospedado no Firebase
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// Endpoint para obter o QR Code
app.get('/qr-code', (req, res) => {
    if (!client) {
        // Inicializa o cliente somente quando necessário
        client = new Client({
            authStrategy: new LocalAuth()
        });

        client.on('qr', (qr) => {
            qrcode.toDataURL(qr, (err, url) => {
                if (err) {
                    console.error('Erro ao gerar QR Code', err);
                    return res.status(500).json({ error: 'Erro ao gerar QR Code' });
                }
                res.json({ qrCodeUrl: url });
            });
        });

        client.on('ready', () => {
            console.log('WhatsApp client está pronto!');
        });

        // Inicializa o cliente
        client.initialize();
    } else {
        // Caso o cliente já tenha sido inicializado, apenas retorne o QR Code se disponível
        if (client.isReady) {
            return res.status(200).json({ status: 'WhatsApp client already ready' });
        }
        res.status(400).json({ error: 'QR Code ainda não gerado!' });
    }
});

// Endpoint para enviar mensagens via WhatsApp
app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;
    if (!client || !client.isReady) {
        return res.status(400).send({ error: 'WhatsApp client não está pronto' });
    }

    try {
        const chatId = `${number}@c.us`;
        await client.sendMessage(chatId, message);
        res.status(200).send({ status: 'Mensagem enviada!' });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Erro ao enviar mensagem' });
    }
});

// Definindo a porta para o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
