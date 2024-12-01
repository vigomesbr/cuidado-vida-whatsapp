const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');
const qrcode = require('qrcode');
const app = express();

// Inicializando o cliente com LocalAuth para persistência de sessão
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

// Middleware para permitir CORS (Cross-Origin Resource Sharing)
app.use(cors({
    origin: 'https://cuidado-vida.web.app', // Substitua pela URL do seu frontend hospedado no Firebase
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

// Middleware para análise de JSON (necessário para enviar mensagens)
app.use(express.json());

// Armazenar o URL do QR Code
let qrCodeUrl = null;

// Função para reiniciar o cliente e gerar um novo QR Code
const restartClient = () => {
    console.log('Sessão expirada ou falhou, gerando novo QR Code...');
    client.destroy(); // Destrói a instância atual
    client.initialize(); // Reinicializa a instância para gerar um novo QR Code
};

// Verificar se a autenticação foi bem-sucedida
client.on('authenticated', () => {
    console.log('WhatsApp autenticado com sucesso!');
});

client.on('auth_failure', () => {
    console.log('Falha na autenticação! Gerando novo QR Code...');
    qrCodeUrl = null;
    restartClient(); // Reinicia o cliente e gera um novo QR Code
});

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

// Verificar se o cliente foi desconectado ou perdeu a conexão
client.on('disconnected', () => {
    console.log('Cliente desconectado! Gerando novo QR Code...');
    qrCodeUrl = null;
    restartClient(); // Reinicia a geração do QR Code
});

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

    // Validação para garantir que o número esteja no formato correto
    if (!/^\d+$/.test(number)) {
        return res.status(400).json({ error: 'Número inválido!' });
    }

    const chatId = `${number}@c.us`;

    // Validação para evitar banimento do número
    try {
        // Evitar excesso de mensagens consecutivas (exemplo de precaução)
        if (message.length > 4096) {
            return res.status(400).json({ error: 'Mensagem muito longa!' });
        }

        // Verifica se o número já foi banido
        const chat = await client.getChatById(chatId);
        if (chat.isBlocked) {
            return res.status(400).json({ error: 'Número bloqueado!' });
        }

        // Envia a mensagem
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

// Inicializando o cliente
client.initialize();
