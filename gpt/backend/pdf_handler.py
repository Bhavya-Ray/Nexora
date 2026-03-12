import os
import sys
import json
import ollama
import traceback
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings

# Use a fixed local directory for ChromaDB so embeddings persist
DB_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")

def get_embedding_model():
    return OllamaEmbeddings(model="nomic-embed-text")

def ingest_pdf(pdf_path):
    try:
        if not os.path.exists(pdf_path):
            print(json.dumps({"error": f"File not found: {pdf_path}"}))
            sys.exit(1)

        loader = PyPDFLoader(pdf_path)
        documents = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=150
        )
        texts = text_splitter.split_documents(documents)

        # Initialize/Update vector sync
        embedding = get_embedding_model()
        
        # Clear old database if we only want 1 PDF active at a time (optional, but good for isolation)
        if os.path.exists(DB_DIR):
            import shutil
            shutil.rmtree(DB_DIR, ignore_errors=True)

        Chroma.from_documents(texts, embedding, persist_directory=DB_DIR)

        print(json.dumps({"success": True, "message": f"Successfully processed {len(texts)} chunks."}))
    except Exception as e:
        print(json.dumps({"error": str(e), "trace": traceback.format_exc()}))
        sys.exit(1)

def query_pdf(question):
    try:
        if not os.path.exists(DB_DIR):
            print(json.dumps({"error": "No database found. Please upload a PDF first."}))
            sys.exit(1)

        embedding = get_embedding_model()
        db = Chroma(persist_directory=DB_DIR, embedding_function=embedding)

        docs = db.similarity_search(question, k=3)
        context = "\n".join([doc.page_content for doc in docs])

        prompt = f"""
You are an AI assistant that answers questions using the provided PDF context.

Rules:
- Answer ONLY using the provided context
- If the answer is not in the document say "Not found in document"
- Be concise
- Cite important details

Context:
{context}

Question:
{question}

Answer using only the context above.
"""

        response = ollama.generate(
            model="llama3",
            prompt=prompt
        )

        print(json.dumps({
            "success": True, 
            "reply": response.get("response", ""), 
            "context_used": True
        }))

    except Exception as e:
        print(json.dumps({"error": str(e), "trace": traceback.format_exc()}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python pdf_handler.py [--ingest <path> | --query <question>]"}))
        sys.exit(1)

    command = sys.argv[1]
    arg = sys.argv[2]

    if command == "--ingest":
        ingest_pdf(arg)
    elif command == "--query":
        query_pdf(arg)
    else:
        print(json.dumps({"error": f"Unknown command: {command}"}))
        sys.exit(1)
