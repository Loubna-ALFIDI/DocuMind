# DocuMind

DocuMind is a private, source-aware RAG assistant for asking questions about your own PDF, text, and Markdown documents. The FastAPI backend uses LangChain document loaders, `RecursiveCharacterTextSplitter`, Hugging Face sentence-transformer embeddings, the LangChain Chroma vector store, and `ChatGroq` for answer generation. Retrieved passages are included as answer context, with source cards and inline source references.

## Run with Make

Run `make` to see available commands. The quickest start is:

```sh
make setup   # creates .env from .env.example if needed
# Set GROQ_API_KEY in .env
make up      # builds and starts both services
```

`make up` builds both Docker images, installing Python dependencies with `pip` and frontend dependencies with `npm` inside the images. You can run `make install` to build/install first, then `make up`. No local Python or Node dependency setup is needed for the Docker workflow.

Open [http://localhost:3000](http://localhost:3000). Use `make logs`, `make down`, and `make ps` to manage the app. `make clean` removes containers but keeps indexed documents and ChromaDB data.

The first backend start downloads the configured Sentence Transformers model. Add your API key from the [Groq Console](https://console.groq.com/keys) as `GROQ_API_KEY` in `.env`; choose an available Groq model with `GROQ_MODEL`. Uploaded files and ChromaDB data persist in local `data/` and `chroma_data/` directories. These directories are ignored by Git. The API is available at [http://localhost:8000](http://localhost:8000), with interactive docs at `/docs`.

## API

- `POST /documents/upload` — multipart field `file`; supports PDF, TXT, and MD.
- `GET /documents` — list indexed documents.
- `DELETE /documents/{id}` — remove a document and all its chunks.
- `POST /chat` — JSON `{ "question": "..." }`; returns an answer and retrieved source excerpts.
- `GET /health` — service health.

PDF source locations use extracted page numbers. TXT and Markdown sources identify their chunk. Scanned PDFs without embedded text need OCR and are not indexed by this first version.
