#!/bin/bash

echo "=== Setting up Backend ==="
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
echo "Installing Python dependencies..."
pip install -r requirements.txt
cd ..

echo "=== Setting up Frontend ==="
cd dashboard
echo "Installing Node dependencies..."
npm install
cd ..

echo "=== Setup Complete! ==="
