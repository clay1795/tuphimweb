// PM2 Ecosystem Config
// Run: pm2 start ecosystem.config.js

module.exports = {
    apps: [
        {
            name: 'tuphim',
            script: './server/server.js',
            cwd: '/var/www/tuphim',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'production',
                PORT: 3001
            },
            // Logs
            out_file: './logs/app.log',
            error_file: './logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            // Restart policy
            restart_delay: 5000,
            max_restarts: 10,
        }
    ]
};
