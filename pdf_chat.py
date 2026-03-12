import os
import sys
import ollama
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings

PDF_FILE = "your_file.pdf"

if not os.path.exists(PDF_FILE):
    print(f"Error: Could not find '{PDF_FILE}'. Please place a PDF in this directory and rename it to '{PDF_FILE}' or update this script.")
    sys.exit(1)

print(f"Loading '{PDF_FILE}'...")
# Load PDF
loader = PyPDFLoader(PDF_FILE)
documents = loader.load()

# Split text
print("Processing text chunks...")
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)

texts = text_splitter.split_documents(documents)

# Create embeddings
print("Initializing embedding model (this might take a moment the first time)...")
embedding = SentenceTransformerEmbeddings(
    model_name="all-MiniLM-L6-v2"
)

# Store in vector database
print("Building local vector database...")
db = Chroma.from_documents(texts, embedding)

print("\n✅ PDF loaded and processed successfully!")

def summarize_pdf():
    print("\n--- Generating PDF Summary ---")
    full_text = "\n".join([doc.page_content for doc in texts])
    
    prompt = f"""
Summarize the following PDF in simple bullet points:

{full_text[:8000]}
"""
    try:
        response = ollama.generate(
            model="llama3",
            prompt=prompt
        )
        print(response["response"])
    except Exception as e:
        print(f"Error generating summary: {e}. Is Ollama running?")
    print("------------------------------\n")

# Uncomment the next line if you want it to print a summary automatically on startup:
# summarize_pdf()

while True:
    question = input("\nAsk a question about the PDF (or skip by typing 'exit'): ")

    if question.strip().lower() == "exit":
        break
    
    if not question.strip():
        continue

    print("Searching...")
    docs = db.similarity_search(question, k=3)

    context = "\n".join([doc.page_content for doc in docs])

    prompt = f"""
You are a document analysis assistant.

Rules:
- Answer ONLY using the provided context
- If the answer is not in the document say "Not found in document"
- Be concise
- Cite important details

Context:
{context}

User question:
{question}

Answer using only the context above.
"""
    try:
        response = ollama.generate(
            model="llama3",
            prompt=prompt
        )

        print("\nAnswer:")
        print(response["response"])
    except Exception as e:
        print(f"\nError communicating with Ollama: {e}\nMake sure Ollama is running ('ollama run llama3') inside another terminal.")

print("\nGoodbye!")
