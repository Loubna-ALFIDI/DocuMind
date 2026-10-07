import os
from pathlib import Path

DATA_DIR = Path(os.getenv("DATA_DIR", "/app/data"))
CHROMA_DIR = Path(os.getenv("CHROMA_DIR", "/app/chroma_data"))
COLLECTION_NAME = "documind"
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "160"))
TOP_K = int(os.getenv("TOP_K", "5"))
