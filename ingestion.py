import os
from typing import List, Dict, Any
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain.schema import Document
from sentence_transformers import SentenceTransformer
import numpy as np

class OllamaEmbeddings:
    """Custom embedding class using local models"""
    
    def __init__(self, model_name: str = "nomic-embed-text"):
        # Initialize the local embedding model
        # Note: This uses SentenceTransformers as a fallback if Ollama embeddings aren't directly available
        try:
            import ollama
            self.client = ollama.Client()
            self.model_name = model_name
            self.use_ollama = True
            
            # Test if the model is available
            try:
                self.client.embeddings(model=model_name, prompt="test")
            except Exception:
                print(f"Warning: Ollama model {model_name} not available, falling back to SentenceTransformers")
                self.use_ollama = False
        except ImportError:
            self.use_ollama = False
        
        if not self.use_ollama:
            # Fallback to a similar model via SentenceTransformers
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of documents"""
        if self.use_ollama:
            embeddings = []
            for text in texts:
                response = self.client.embeddings(model=self.model_name, prompt=text)
                embeddings.append(response['embedding'])
            return embeddings
        else:
            return self.model.encode(texts).tolist()
    
    def embed_query(self, text: str) -> List[float]:
        """Embed a single query"""
        if self.use_ollama:
            response = self.client.embeddings(model=self.model_name, prompt=text)
            return response['embedding']
        else:
            return self.model.encode([text])[0].tolist()

class PDFIngestion:
    """Handles PDF loading, chunking, and vector store creation"""
    
    def __init__(self, chunk_size: int = 600, chunk_overlap: int = 150):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        # Initialize local embeddings
        self.embeddings = OllamaEmbeddings("nomic-embed-text")
    
    def load_and_split(self, pdf_path: str) -> List[Document]:
        """Load PDF and split into chunks"""
        
        # Load PDF using PyPDFLoader
        loader = PyPDFLoader(pdf_path)
        pages = loader.load()
        
        # Add page numbers and enhance metadata
        enhanced_docs = []
        for i, page in enumerate(pages):
            # Add page number to metadata
            page.metadata.update({
                "page": i + 1,
                "source": pdf_path,
                "chunk_type": "page"
            })
            enhanced_docs.append(page)
        
        # Split documents into smaller chunks
        documents = self.text_splitter.split_documents(enhanced_docs)
        
        # Enhance chunk metadata
        for i, doc in enumerate(documents):
            doc.metadata.update({
                "chunk_id": i,
                "total_chunks": len(documents)
            })
            
            # Extract paragraph info for better citation
            content_lines = doc.page_content.split('\n')
            non_empty_lines = [line.strip() for line in content_lines if line.strip()]
            if non_empty_lines:
                doc.metadata["first_line"] = non_empty_lines[0][:100]
        
        return documents
    
    def create_vector_store(self, documents: List[Document]) -> Chroma:
        """Create vector store from documents"""
        
        # Create Chroma vector store with local embeddings
        vector_store = Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=None  # In-memory store
        )
        
        return vector_store
    
    def extract_text_metadata(self, text: str, page_num: int) -> Dict[str, Any]:
        """Extract useful metadata from text content"""
        
        lines = text.split('\n')
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        return {
            "line_count": len(lines),
            "paragraph_count": len(paragraphs),
            "char_count": len(text),
            "word_count": len(text.split()),
            "has_numbers": any(char.isdigit() for char in text),
            "has_uppercase": any(char.isupper() for char in text)
        }
