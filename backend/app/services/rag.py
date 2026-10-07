import hashlib
from pathlib import Path

from fastapi import HTTPException, UploadFile
from groq import Groq
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import CHROMA_DIR, CHUNK_OVERLAP, CHUNK_SIZE, COLLECTION_NAME, DATA_DIR, EMBEDDING_MODEL, GROQ_API_KEY, GROQ_MODEL, TOP_K

DATA_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DIR.mkdir(parents=True, exist_ok=True)
_embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL, encode_kwargs={"normalize_embeddings": True})
_vector_store = Chroma(collection_name=COLLECTION_NAME, embedding_function=_embeddings, persist_directory=str(CHROMA_DIR), collection_metadata={"hnsw:space": "cosine"})
_splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)


def get_vector_store():
    return _vector_store


async def index_upload(upload: UploadFile):
    filename = Path(upload.filename or "document").name
    suffix = Path(filename).suffix.lower()
    if suffix not in {".txt", ".md", ".pdf"}:
        raise HTTPException(415, "Supported formats are PDF, TXT, and Markdown.")
    payload = await upload.read()
    if not payload:
        raise HTTPException(400, "The selected file is empty.")
    document_id = hashlib.sha256((filename + hashlib.sha256(payload).hexdigest()).encode()).hexdigest()[:20]
    path = DATA_DIR / f"{document_id}{suffix}"
    path.write_bytes(payload)

    try:
        loaded_documents = PyPDFLoader(str(path)).load() if suffix == ".pdf" else TextLoader(str(path), encoding="utf-8-sig").load()
    except Exception as exc:
        path.unlink(missing_ok=True)
        raise HTTPException(400, f"Could not read this document: {exc}") from exc
    if not any(document.page_content.strip() for document in loaded_documents):
        path.unlink(missing_ok=True)
        raise HTTPException(400, "No readable text was found in this document.")

    for document in loaded_documents:
        page = document.metadata.get("page")
        document.metadata.update({"document_id": document_id, "filename": filename})
        if page is not None:
            document.metadata["page"] = int(page) + 1
    chunks = _splitter.split_documents(loaded_documents)
    if not chunks:
        path.unlink(missing_ok=True)
        raise HTTPException(400, "No readable text was found in this document.")

    store = get_vector_store()
    # Re-uploading identical content replaces its existing vectors.
    store.delete(where={"document_id": document_id})
    ids = [f"{document_id}-{index}" for index in range(len(chunks))]
    store.add_documents(chunks, ids=ids)
    return {"id": document_id, "filename": filename, "chunks": len(chunks)}


def list_documents():
    metadatas = get_vector_store().get(include=["metadatas"])["metadatas"] or []
    documents = {}
    for metadata in metadatas:
        documents[metadata["document_id"]] = {"id": metadata["document_id"], "filename": metadata["filename"]}
    return list(documents.values())


def delete_document(document_id: str):
    store = get_vector_store()
    store.delete(where={"document_id": document_id})
    for path in DATA_DIR.glob(f"{document_id}.*"):
        path.unlink(missing_ok=True)
    return {"ok": True}


async def answer_question(question: str):
    if not question.strip():
        raise HTTPException(400, "Write a question first.")
    store = get_vector_store()
    if not store.get(include=[])["ids"]:
        raise HTTPException(400, "Upload a document before asking a question.")
    retrieved = store.similarity_search_with_relevance_scores(question, k=TOP_K)
    if not retrieved:
        raise HTTPException(404, "No relevant passages were found in your documents.")

    sources = []
    context_sections = []
    for index, (document, score) in enumerate(retrieved, start=1):
        metadata = document.metadata
        page = metadata.get("page")
        source = {
            "filename": metadata["filename"],
            "page": page,
            "chunk": index,
            "excerpt": document.page_content,
            "score": round(float(score), 3),
        }
        sources.append(source)
        location = f", page {page}" if page else ""
        context_sections.append(f"[Source {index}: {metadata['filename']}{location}]\n{document.page_content}")

    if not GROQ_API_KEY:
        raise HTTPException(503, "Add GROQ_API_KEY to the backend environment to enable answer generation.")
    try:
        client = Groq()
        context = "\n\n".join(context_sections)
        system_prompt = """
            Answer using only the supplied document excerpts.
            If they do not contain enough information, say so clearly.
            Do not invent facts. Cite claims inline as [Source 1], [Source 2], matching the labels.
        """
        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": f"DOCUMENT EXCERPTS\n{context}\n\nQUESTION\n{question}"
                }
            ],
            temperature=0.2
        )
        return {"answer": completion.choices[0].message.content, "sources": sources}
    except Exception as exc:
        raise HTTPException(502, f"The answer service could not respond: {exc}") from exc
