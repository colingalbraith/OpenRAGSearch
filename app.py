import os
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any
import json
from dotenv import load_dotenv

from ingestion import PDFIngestion
from rag_graph import RAGGraph

# Load environment variables
load_dotenv()

app = FastAPI(title="Research Assistant MVP", version="1.0.0")

# Global variables to hold our data
vector_store = None
rag_graph = None
pdf_ingestion = None
current_pdf_path = None

class QuestionRequest(BaseModel):
    question: str
    session_notes: List[Dict[str, Any]] = []

class QuestionResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    page_references: List[Dict[str, Any]]

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process a PDF file"""
    global vector_store, rag_graph, pdf_ingestion, current_pdf_path
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Save uploaded file
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, file.filename)
        current_pdf_path = file_path
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Process the PDF with optimized chunking
        pdf_ingestion = PDFIngestion(chunk_size=400, chunk_overlap=100)
        documents = pdf_ingestion.load_and_split(file_path)
        vector_store = pdf_ingestion.create_vector_store(documents)
        
        # Initialize RAG graph with documents
        rag_graph = RAGGraph(vector_store, documents)
        
        return {
            "message": "PDF uploaded and processed successfully",
            "filename": file.filename,
            "total_chunks": len(documents)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.post("/qa", response_model=QuestionResponse)
async def ask_question(request: QuestionRequest):
    """Ask a question about the uploaded PDF"""
    global rag_graph
    
    if not rag_graph:
        raise HTTPException(status_code=400, detail="No PDF has been uploaded yet")
    
    try:
        # Process the question through RAG graph
        result = rag_graph.process_question(request.question, request.session_notes)
        
        return QuestionResponse(
            answer=result["answer"],
            sources=result["sources"],
            page_references=result["page_references"]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

@app.get("/pdf/{filename}")
async def serve_pdf(filename: str):
    """Serve the uploaded PDF file"""
    file_path = os.path.join("uploads", filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="application/pdf")
    else:
        raise HTTPException(status_code=404, detail="PDF file not found")

@app.get("/status")
async def get_status():
    """Get current system status"""
    global rag_graph, vector_store, pdf_ingestion, current_pdf_path
    
    return {
        "rag_graph_loaded": rag_graph is not None,
        "vector_store_loaded": vector_store is not None,
        "pdf_ingestion_loaded": pdf_ingestion is not None,
        "current_pdf": current_pdf_path,
        "total_documents": len(rag_graph.all_documents) if rag_graph else 0
    }

# Mount static files for frontend
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_root():
    """Serve the main application page"""
    return FileResponse("static/index.html")

# Serve individual static files for direct access
@app.get("/styles.css")
async def serve_css():
    return FileResponse("static/styles.css", media_type="text/css")

@app.get("/main.js")
async def serve_js():
    return FileResponse("static/main.js", media_type="application/javascript")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
