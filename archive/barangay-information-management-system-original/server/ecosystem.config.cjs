module.exports = {
  apps: [
    {
      name: 'bims-backend',
      script: 'server.js',
      cwd: '/home/ubuntu/BIMS/server',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster', // Enable cluster mode
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
