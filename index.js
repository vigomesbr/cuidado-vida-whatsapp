const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Criação do app Express
const app = express();
const port = process.env.PORT || 3000;  // Use a variável PORT para produção

// Configuração do CORS para permitir requisições do frontend
const corsOptions = {
    origin: 'https://cuidado-vida.web.app', // Substitua com o domínio do seu frontend
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));

// Configuração para ler o corpo da requisição em JSON
app.use(bodyParser.json());

// Caminho onde as sessões serão armazenadas (garantir persistência)
const sessionPath = path.join(__dirname, 'sessions');

// Criação do cliente WhatsApp com LocalAuth para persistência
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'client1',  // Identificador único para a sessão
        dataPath: sessionPath  // Caminho onde as sessões serão armazenadas
    }),
    puppeteer: {
        headless: true,  // Executar o navegador sem interface gráfica
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--single-process', '--no-zygote'],
        defaultViewport: null, // Não especificar viewport para evitar sobrecarga
    }
});

// Configuração para minimizar os logs e consumo de recursos
client.on('qr', (qr) => {
    console.log('QR RECEIVED (somente uma vez para escanear)', qr);
    // Aqui você pode emitir o QR code via WebSocket ou uma rota HTTP para o frontend
});

client.on('authenticated', () => {
    console.log('Autenticado com sucesso!');
});

client.on('auth_failure', (message) => {
    console.error('Falha na autenticação:', message);
});

client.on('ready', () => {
    console.log('Cliente WhatsApp pronto para uso!');
});

// Inicializar o cliente
client.initialize();

// Endpoint para enviar mensagem via WhatsApp
app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).json({ error: 'Número e mensagem são obrigatórios.' });
    }

    try {
        const formattedNumber = number.replace(/[^\d]+/g, ''); // Remove qualquer caractere não numérico
        if (formattedNumber.length < 11) { // 11 dígitos para números com DDD (Brasil por exemplo)
            return res.status(400).json({ error: 'Número inválido. Certifique-se de incluir o código do país e DDD.' });
        }

        const chat = await client.getChatById(`${formattedNumber}@c.us`);

        if (chat) {
            await chat.sendMessage(message);
            return res.status(200).json({ status: 'Mensagem enviada com sucesso!' });
        } else {
            return res.status(400).json({ error: 'Não foi possível encontrar o chat com o número informado.' });
        }
    } catch (error) {
        console.error('Erro ao enviar a mensagem:', error);
        return res.status(500).json({ error: 'Erro ao enviar mensagem. Tente novamente.' });
    }
});

// Endpoint para verificar o status da autenticação
app.get('/status', (req, res) => {
    if (client.info && client.info.pushname) {
        res.json({ status: 'Autenticado', pushname: client.info.pushname });
    } else {
        res.json({ status: 'Não autenticado' });
    }
});

// Iniciar o servidor Express
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

// Função para monitorar falhas de conexão e reautenticar automaticamente
client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
    setTimeout(() => {
        client.initialize();
    }, 5000);  // Esperar 5 segundos antes de tentar reconectar
});
