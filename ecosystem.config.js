module.exports = {
    apps: [
      {
        name: 'whatsapp-api',  // Nome da aplicação
        script: './index.js',  // Caminho do seu arquivo de entrada (geralmente index.js ou app.js)
        watch: true,  // Ativa a vigilância para reiniciar automaticamente em caso de mudanças
        instances: 1,  // O número de instâncias (idealmente, 1 em Render devido ao limite de threads)
        autorestart: true,  // Reiniciar automaticamente em caso de falha
        max_memory_restart: '200M',  // Reiniciar o processo caso o uso de memória ultrapasse 200MB
        env: {
          NODE_ENV: 'development',  // Definir o ambiente como desenvolvimento por padrão
        },
        env_production: {
          NODE_ENV: 'production',  // Definir o ambiente como produção
        },
      },
    ],
  };
  