# Root & General Initialization Plan

## 1. Root Configuration

The root directory will manage the orchestration of the three components.

**`.gitignore`**
```
# Python
__pycache__/
*.py[cod]
*$py.class
venv/
.env

# Node
node_modules/
dist/
.DS_Store

# Output
output/videos/
output/YYYY-MM-DD_*/

# IDE
.vscode/
.idea/
```

## 2. Integration Strategy

Since this is a local tool, the integration relies on hardcoded local ports (configurable via env).

- **Backend:** `http://localhost:8000`
- **Frontend:** `http://localhost:5173`
- **Ollama:** `http://localhost:11434`

### CORS
The Backend must enable CORS for `http://localhost:5173` (Dashboard) and `chrome-extension://<id>` (Extension).

## 3. Startup Scripts

To make it easy to start everything, we can add a `start.sh` (or `Makefile`).

**`start.sh`**
```bash
#!/bin/bash

# Function to kill processes on exit
cleanup() {
    echo "Shutting down..."
    kill $(jobs -p)
}
trap cleanup EXIT

# Start Backend
echo "Starting Backend..."
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "Starting Dashboard..."
cd dashboard
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait
wait
```

## 4. Execution Plan (Root)

1.  **Create `.gitignore`**: Ensure all generated files are ignored.
2.  **Create `README.md`**: Update the root readme with "Getting Started" instructions pointing to these specs.
3.  **Setup Scripts**: Create `start.sh` and `setup.sh` (to install all deps in one go).

**`setup.sh`**
```bash
#!/bin/bash

echo "Setting up Backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

echo "Setting up Frontend..."
cd dashboard
npm install
cd ..

echo "Setup Complete!"
```
