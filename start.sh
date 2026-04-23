#!/bin/bash

# IPTV PRO - Ubuntu Server Startup Script

echo "========================================="
echo "    📺 IPTV PRO Serverni Ishga Tushirish"
echo "========================================="

# Check if Node.js is installed
if command -v node >/dev/null 2>&1; then
    echo "✅ Node.js aniqlandi."
    echo "🚀 Dastur 8080-portda ishga tushyapti..."
    # node server.js ni ishga tushiramiz
    node server.js
# If NodeJS is not available, fallback to Python3
elif command -v python3 >/dev/null 2>&1; then
    echo "⚠️ Node.js topilmadi. Python3 usuli ishlatilmoqda..."
    echo "🚀 Dastur 8080-portda ishga tushyapti..."
    python3 -m http.server 8080 --bind 0.0.0.0
# If neither is available
else
    echo "❌ XATOLIK: Node.js ham, Python3 ham o'rnatilmagan!"
    echo "Iltimos, avval Node.js o'rnating:"
    echo "sudo apt update && sudo apt install nodejs -y"
fi
