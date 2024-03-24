#!/bin/bash
# Navigate to your application directory
cd /home/livebird/app/livebird/backend

# Start your application using PM2
pm2 start ./app/index.js --cwd ./
