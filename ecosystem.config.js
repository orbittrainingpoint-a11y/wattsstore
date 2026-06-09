/** PM2 process definitions for WattsStore on Ubuntu VPS.
 *
 * Usage:
 *   pm2 start ecosystem.config.js          # start all
 *   pm2 restart ecosystem.config.js        # restart all
 *   pm2 save                               # persist across reboots
 *   pm2 startup                            # auto-start on boot
 */
module.exports = {
  apps: [
    {
      name: 'wattsstore-api',
      cwd: './api',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--max-old-space-size=512',
      env: { NODE_ENV: 'production', PORT: 4101 },
      error_file: '/var/log/pm2/wattsstore-api-error.log',
      out_file: '/var/log/pm2/wattsstore-api-out.log',
      merge_logs: true,
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      // BullMQ workers: email delivery + PDF generation (Puppeteer).
      // MUST run alongside the API — without this, quotes/invoices/emails never deliver.
      name: 'wattsstore-workers',
      cwd: './api',
      script: 'dist/workers/index.js',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--max-old-space-size=512',
      env: { NODE_ENV: 'production' },
      error_file: '/var/log/pm2/wattsstore-workers-error.log',
      out_file: '/var/log/pm2/wattsstore-workers-out.log',
      merge_logs: true,
      restart_delay: 5000,
      max_restarts: 10,
    },
    {
      name: 'wattsstore-web',
      cwd: './frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3101',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--max-old-space-size=1024',
      env: { NODE_ENV: 'production' },
      error_file: '/var/log/pm2/wattsstore-web-error.log',
      out_file: '/var/log/pm2/wattsstore-web-out.log',
      merge_logs: true,
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
