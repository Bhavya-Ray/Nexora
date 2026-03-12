import os
import json
import ollama
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings

# Fixed directory for memory embeddings
MEMORY_DB_DIR = os.path.join(os.path.dirname(__file__), "memory_db")

def get_embedding_model():
    return OllamaEmbeddings(model="nomic-embed-text")

def save_fact(fact_text):
    """Stores a fact about the user in ChromaDB."""
    embedding = get_embedding_model()
    db = Chroma(persist_directory=MEMORY_DB_DIR, embedding_function=embedding)
    db.add_texts([fact_text])
    return True

def get_relevant_facts(query):
    """Retrieves relevant facts from ChromaDB based on user query."""
    if not os.path.exists(MEMORY_DB_DIR):
        return []
        
    embedding = get_embedding_model()
    db = Chroma(persist_directory=MEMORY_DB_DIR, embedding_function=embedding)
    docs = db.similarity_search(query, k=5)
    return [doc.page_content for doc in docs]

def extract_and_save_facts(user_input, assistant_reply=None):
    """Uses Ollama to extract user facts from conversation and saves them."""
    context = f"User said: {user_input}"
    if assistant_reply:
        context += f"\nAssistant replied: {assistant_reply}"
        
    prompt = f"""
Extract short, important user facts (name, preferences, goals, job, etc.).
Context:
{context}

Rules:
- Return ONLY short sentences (e.g., "User's name is Bhavya")
- One fact per line
- If no new facts found, return "NONE"
"""
    try:
        response = ollama.generate(model="llama3", prompt=prompt)
        facts = response.get("response", "").strip().split("\n")
        
        saved_any = False
        for fact in facts:
            fact = fact.strip()
            if fact and fact.upper() != "NONE":
                save_fact(fact)
                saved_any = True
        return saved_any
    except Exception as e:
        print(f"Extraction error: {e}")
        return False

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        sys.exit(1)
        
    cmd = sys.argv[1]
    arg = sys.argv[2]
    
    if cmd == "--get":
        facts = get_relevant_facts(arg)
        print(json.dumps({"facts": facts}))
    elif cmd == "--extract":
        success = extract_and_save_facts(arg)
        print(json.dumps({"success": success}))
