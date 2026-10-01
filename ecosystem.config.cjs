// PM2 process file. Usage (from backend/): pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'savira-exhibition-api',
      script: 'src/server.js',
      cwd: __dirname,
      // Single instance: rate-limit counters are kept in memory.
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '300M',
      kill_timeout: 10000,
      time: true,
    },
  ],
};
