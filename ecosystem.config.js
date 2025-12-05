// PM2 Ecosystem Configuration for EduTech Backend
// Production deployment without Docker

module.exports = {
  apps: [
    {
      name: 'edutech-api',
      script: 'dist/index.js',
      cwd: '/opt/edutech-backend',
      instances: 1, // Single instance for 1 CPU VM
      exec_mode: 'fork',
      
      // Environment variables (production)
      env_production: {
        NODE_ENV: 'production',
        PORT: 8000,
      },
      
      // Auto-restart on crash
      autorestart: true,
      watch: false,
      max_memory_restart: '400M', // Restart if memory exceeds 400MB
      
      // Logging
      log_file: '/var/log/edutech/combined.log',
      out_file: '/var/log/edutech/out.log',
      error_file: '/var/log/edutech/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Restart strategy
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      restart_delay: 1000,
      
      // Health monitoring
      min_uptime: '10s',
    },
  ],
};
