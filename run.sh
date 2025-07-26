#!/bin/bash

# RAG Application Launcher Script
# This script automatically activates the virtual environment and runs the application

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting RAG Application...${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo -e "${RED}❌ Virtual environment not found!${NC}"
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv .venv
fi

# Activate virtual environment
echo -e "${YELLOW}🔧 Activating virtual environment...${NC}"
source .venv/bin/activate

# Check if requirements are installed
if [ ! -f ".requirements_installed" ]; then
    echo -e "${YELLOW}📦 Installing requirements...${NC}"
    pip install -r requirements.txt
    touch .requirements_installed
fi

# Check if Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
    echo -e "${YELLOW}🤖 Starting Ollama service...${NC}"
    ollama serve &
    sleep 3
fi

# Check if gemma2:2b model is available
echo -e "${YELLOW}🔍 Checking for gemma2:2b model...${NC}"
if ! ollama list | grep -q "gemma2:2b"; then
    echo -e "${YELLOW}📥 Pulling gemma2:2b model (this may take a while)...${NC}"
    ollama pull gemma2:2b
fi

echo -e "${GREEN}✅ Environment ready!${NC}"
echo -e "${BLUE}🌐 Starting FastAPI server on http://localhost:8000${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"

# Run the application
python app.py
