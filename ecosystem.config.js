module.exports = {
  apps: [
    {
      name: 'pitchroast-backend',
      cwd: './backend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: 'pitchroast-frontend',
      cwd: './',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
