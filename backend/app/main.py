from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.services.rag import answer_question, delete_document, index_upload, list_documents

app = FastAPI(title="DocuMind API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ChatRequest(BaseModel):
    question: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    return await index_upload(file)


@app.get("/documents")
def documents():
    return list_documents()


@app.delete("/documents/{doc_id}")
def remove_document(doc_id: str):
    return delete_document(doc_id)


@app.post("/chat")
async def chat(request: ChatRequest):
    return await answer_question(request.question)
