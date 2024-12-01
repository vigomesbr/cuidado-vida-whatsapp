const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
const client = new Client({
    authStrategy: new LocalAuth()
});

let qrCodeUrl = null;

// Gerar QR Code ao iniciar a sessão
client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Erro ao gerar QR Code', err);
            return;
        }
        qrCodeUrl = url; // Armazenar o QR Code gerado
    });
});

client.on('ready', () => {
    console.log('WhatsApp client está pronto!');
});

client.initialize();

// Endpoint para obter o QR Code
app.get('/qr-code', (req, res) => {
    if (!qrCodeUrl) {
        return res.status(400).json({ error: 'QR Code não gerado ainda!' });
    }
    res.json({ qrCodeUrl });
});

// Endpoint para enviar mensagens
app.use(express.json());
app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;
    try {
        const chatId = `${number}@c.us`;
        await client.sendMessage(chatId, message);
        res.status(200).send({ status: 'Mensagem enviada!' });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Erro ao enviar mensagem' });
    }
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
