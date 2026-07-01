import os
import json
import sqlite3
import numpy as np
import google.genai as genai
import traceback

def get_client():
    return genai.Client()

def generate_embedding(text):
    """Generates a text embedding using Google Gemini."""
    try:
        client = get_client()
        result = client.models.embed_content(
            model='text-embedding-004',
            contents=text,
        )
        # Returns a list of floats
        return result.embeddings[0].values
    except Exception as e:
        traceback.print_exc()
        return None

def compute_cosine_similarity(vec1, vec2):
    """Computes cosine similarity between two vectors."""
    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    if norm1 == 0 or norm2 == 0:
        return 0
    return dot_product / (norm1 * norm2)

def search_knowledge_base(query, top_k=3):
    """Searches the local SQLite knowledge base for the most relevant chunks."""
    try:
        query_embedding = generate_embedding(query)
        if not query_embedding:
            return []

        query_vec = np.array(query_embedding)

        conn = sqlite3.connect('database.db')
        c = conn.cursor()
        c.execute("SELECT id, content, embedding FROM knowledge_base")
        rows = c.fetchall()
        conn.close()

        results = []
        for row in rows:
            row_id = row[0]
            content = row[1]
            emb_str = row[2]
            
            emb_vec = np.array(json.loads(emb_str))
            sim = compute_cosine_similarity(query_vec, emb_vec)
            results.append((sim, content))
            
        # Sort by similarity descending
        results.sort(key=lambda x: x[0], reverse=True)
        
        # Return top_k contents
        return [res[1] for res in results[:top_k]]
        
    except Exception as e:
        traceback.print_exc()
        return []

def add_to_knowledge_base(filename, chunks):
    """Generates embeddings for chunks and saves them to the DB."""
    try:
        conn = sqlite3.connect('database.db')
        c = conn.cursor()
        
        for chunk in chunks:
            if not chunk.strip():
                continue
            emb = generate_embedding(chunk)
            if emb:
                emb_str = json.dumps(emb)
                c.execute("INSERT INTO knowledge_base (filename, content, embedding) VALUES (?, ?, ?)",
                          (filename, chunk, emb_str))
                
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        traceback.print_exc()
        return False
