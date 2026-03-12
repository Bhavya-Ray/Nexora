# Nexora AI - Local Conversational Workspace

Nexora is a powerful, locally-hosted AI assistant designed for privacy, speed, and intelligence. It combines a modern React-based chat interface with a robust Python/Node backend to provide RAG (Retrieval Augmented Generation), Vision capabilities, and persistent memory.

## 🚀 Features

- **Local-First**: Powered by **Ollama**, ensuring all your conversations and data stay on your machine.
- **RAG (PDF Analysis)**: Upload PDFs to search and chat with your documents using **LangChain** and **ChromaDB**.
- **Vision Integration**: Upload and analyze images directly in the chat.
- **Persistent Chat History**: All your conversations are saved in a local **SQLite** database.
- **Semantic Memory**: The assistant automatically extracts and remembers key facts about you (name, preferences, etc.) to provide personalized responses.
- **Modern UI**: A sleek, dark-themed workspace with real-time streaming and intuitive navigation.

## 🛠️ Tech Stack

### Frontend
- **React** (Vite)
- **Vanilla CSS** (Custom styling for a premium feel)
- **Fetch API** (Real-time backend synchronization)

### Backend
- **Node.js** (Express server)
- **SQLite** (Chat history and metadata storage)
- **Python** (Logic for RAG, Semantic Memory, and Image Analysis)
- **ChromaDB** (Vector database for embeddings)

### AI Models (Local)
- **Llama 3**: Main conversational LLM.
- **nomic-embed-text**: Precise embeddings for RAG and Memory.
- **Sentence-Transformers**: Multi-purpose embedding utilities.

## 📥 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+)
- [Python 3.10+](https://www.python.org/)
- [Ollama](https://ollama.com/)

### 1. Set Up AI Models
Pull the required models using Ollama:
```bash
ollama pull llama3
ollama pull nomic-embed-text
```

### 2. Install Dependencies

**Backend:**
```bash
cd gpt/backend
npm install
pip install langchain-community chromadb sentence-transformers ollama pypdf
```

**Frontend:**
```bash
cd gpt/gpt
npm install
```

## 🏃 Running the Project

You need to run both the backend and frontend simultaneously.

### Start Backend
```bash
cd gpt/backend
npm run dev
```

### Start Frontend
```bash
cd gpt/gpt
npm run dev
```

The application will be accessible at `http://localhost:5173`.

## 📂 Project Structure

- `gpt/gpt/`: React frontend application.
- `gpt/backend/`: Node.js server and database.
- `gpt/backend/memory_manager.py`: Python script for semantic memory.
- `gpt/backend/pdf_handler.py`: Python script for RAG (PDF analysis).
- `gpt/backend/image_analyzer.py`: Python script for vision processing.
- `gpt/backend/chat_history.db`: SQLite database for persistent logs.

## 🔐 Privacy
All processing is local. Your data never leaves your device. No cloud APIs, no tracking.
