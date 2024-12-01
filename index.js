const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');
const qrcode = require('qrcode');

const app = express();
const client = new Client({
    authStrategy: new LocalAuth(),
});

// Middleware para permitir CORS (Cross-Origin Resource Sharing)
app.use(cors({
    origin: 'https://cuidado-vida.web.app', // Substitua pela URL do seu frontend hospedado no Firebase
    methods: ['GET', 'POST'], // Defina os métodos permitidos
    allowedHeaders: ['Content-Type'], // Cabeçalhos permitidos
}));

// Middleware para análise de JSON (necessário para o envio de mensagens)
app.use(express.json());

// Armazenar o URL do QR Code
let qrCodeUrl = null;

// Gerar o QR Code quando a sessão for inicializada
client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Erro ao gerar QR Code', err);
            return;
        }
        qrCodeUrl = url; // Armazenar o QR Code gerado
    });
});

// Quando o cliente do WhatsApp estiver pronto
client.on('ready', () => {
    console.log('WhatsApp client está pronto!');
});

// Inicializar o cliente
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

// Definindo a porta para o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
