#!/bin/bash
cd /var/www/ams-chat-web
echo "🔄 Pulling latest changes..."
git pull
echo "📦 Installing dependencies..."
npm install --production
echo "🔄 Restarting server..."
pm2 restart ams-chat
echo "✅ Update complete!"
pm2 logs ams-chat --lines 20