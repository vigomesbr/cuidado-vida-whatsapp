const pm2 = require('pm2');

pm2.connect((err) => {
  if (err) {
    console.error(err);
    process.exit(2);
  }

  pm2.start({
    script: 'index.js', // Caminho para o seu arquivo principal
    name: 'whatsapp-bot',
    watch: true,
    instances: 1,
    autorestart: true,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
    },
  }, (err, apps) => {
    if (err) {
      console.error(err);
      process.exit(2);
    }

    console.log('Aplicação iniciada com PM2');
  });
});
