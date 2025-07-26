import os
from typing import List, Dict, Any
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_community.vectorstores import Chroma
from langchain.schema import Document
import ollama

class OllamaLLM:
    """Custom LLM wrapper for Ollama"""
    
    def __init__(self, model_name: str = "gemma2:2b"):
        self.client = ollama.Client()
        self.model_name = model_name
        
        # Test if the model is available
        try:
            self.client.chat(model=model_name, messages=[{"role": "user", "content": "test"}])
        except Exception as e:
            raise ValueError(f"Ollama model {model_name} not available. Error: {e}")
    
    def predict(self, prompt: str) -> str:
        """Generate a response for the given prompt"""
        try:
            response = self.client.chat(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}]
            )
            return response['message']['content']
        except Exception as e:
            return f"Error generating response: {e}"
    
    def __call__(self, prompt: str) -> str:
        return self.predict(prompt)

class RAGGraph:
    """Handles the RAG (Retrieval-Augmented Generation) pipeline"""
    
    def __init__(self, vector_store: Chroma, documents: List[Document] = None, model_name: str = "gemma2:2b"):
        self.vector_store = vector_store
        self.retriever = vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 15}  # Retrieve more chunks for better filtering
        )
        
        # Store all documents for page-specific queries
        self.all_documents = documents or []
        
        # Initialize Ollama chat model
        self.llm = OllamaLLM(model_name)
        
        # Create custom prompt template
        self.qa_template = """You are an expert research assistant analyzing the "Attention Is All You Need" paper. Your goal is to provide clear, accurate, and comprehensive answers based solely on the provided context.

INSTRUCTIONS:
- Answer the question directly and provide comprehensive details
- Use only information from the provided context
- Always cite page numbers using the format (p. X) when referencing information
- Provide specific details, technical terms, and examples when available
- If the question asks about a specific page, focus primarily on that page's content
- For questions about the paper in general, provide a thorough overview including key contributions
- If you cannot find relevant information, say "I don't have enough information in the provided context to answer this question"
- When discussing the Transformer model, include technical details about its architecture and advantages

Context from PDF:
{context}

Previous session notes (if any):
{session_notes}

Question: {question}

Detailed Answer:"""
    
    def process_question(self, question: str, session_notes: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Process a question through the RAG pipeline"""
        
        # Format session notes for context
        notes_context = ""
        if session_notes:
            notes_context = "\n".join([
                f"Note on page {note.get('page', 'unknown')}: {note.get('content', '')}"
                for note in session_notes
            ])
        
        # Check if this is a page-specific query
        docs = self._retrieve_documents(question)
        
        # Format context from retrieved documents
        context = ""
        for i, doc in enumerate(docs, 1):
            page_num = doc.metadata.get('page', 'unknown')
            content = doc.page_content.strip()
            context += f"[Document {i} - Page {page_num}]\n{content}\n\n"
        
        # Build the full prompt
        full_prompt = self.qa_template.format(
            context=context,
            session_notes=notes_context,
            question=question
        )
        
        # Generate response using Ollama
        answer = self.llm.predict(full_prompt)
        
        # Extract source documents and create page references
        sources = []
        page_references = []
        
        for doc in docs:
            metadata = doc.metadata
            page_num = metadata.get("page", 1)
            
            source_info = {
                "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                "page": page_num,
                "chunk_id": metadata.get("chunk_id", 0),
                "first_line": metadata.get("first_line", "")
            }
            sources.append(source_info)
            
            # Create clickable page reference
            page_ref = {
                "page": page_num,
                "text": f"p.{page_num}",
                "preview": doc.page_content[:100] + "..." if len(doc.page_content) > 100 else doc.page_content
            }
            
            # Avoid duplicate page references
            if not any(ref["page"] == page_num for ref in page_references):
                page_references.append(page_ref)
        
        # Sort page references by page number
        page_references.sort(key=lambda x: x["page"])
        
        return {
            "answer": answer,
            "sources": sources,
            "page_references": page_references
        }
        
    def _retrieve_documents(self, question: str) -> List[Document]:
        """Retrieve documents based on question type"""
        import re
        
        # Check for page-specific queries
        page_pattern = r'\b(?:page|p\.?)\s*(\d+)\b'
        page_matches = re.findall(page_pattern, question.lower())
        
        if page_matches:
            # This is a page-specific query
            target_pages = [int(page) for page in page_matches]
            
            # Filter cached documents by page number
            page_docs = []
            for doc in self.all_documents:
                if doc.metadata.get('page') in target_pages:
                    page_docs.append(doc)
            
            # Sort by chunk_id to maintain order
            page_docs.sort(key=lambda x: x.metadata.get('chunk_id', 0))
            
            if page_docs:
                return page_docs
            else:
                # Fallback: semantic search with original query
                return self.retriever.invoke(question)
        else:
            # Normal semantic search with enhanced query processing and content filtering
            enhanced_query = question
            
            # For general questions about the paper, enhance with key terms
            if any(term in question.lower() for term in ['what is this paper', 'paper about', 'abstract', 'summary', 'summarize']):
                enhanced_query = f"{question} transformer attention mechanism neural network architecture model"
            
            # Get initial results
            raw_docs = self.retriever.invoke(enhanced_query)
            
            # Filter out citation-heavy chunks for general queries
            filtered_docs = []
            citation_docs = []
            
            for doc in raw_docs:
                content = doc.page_content.lower()
                
                # Count citation indicators
                citation_indicators = [
                    content.count('[' + str(i) + ']') for i in range(1, 50)
                ]
                total_citations = sum(citation_indicators)
                
                # Check if this is primarily citations
                is_citation_heavy = (
                    total_citations > 3 or  # Many numbered references
                    ('arxiv' in content and 'proceedings' in content) or  # Typical citation format
                    (content.count('et al') > 2)  # Many author references
                )
                
                if is_citation_heavy:
                    citation_docs.append(doc)
                else:
                    filtered_docs.append(doc)
            
            # For general queries, prefer content over citations
            if filtered_docs and any(term in question.lower() for term in ['summary', 'summarize', 'what is', 'paper about', 'abstract']):
                # Prioritize early pages (1-3) for summaries and overviews
                early_page_docs = [doc for doc in filtered_docs if doc.metadata.get('page', 1) <= 3]
                other_docs = [doc for doc in filtered_docs if doc.metadata.get('page', 1) > 3]
                
                # Combine without duplicates, prioritizing early pages
                result_docs = early_page_docs[:5] + other_docs[:3] + citation_docs[:2]
                return result_docs[:10]  # Limit to 10 total
            
            # If no good content found, use original results
            return filtered_docs[:8] + citation_docs[:2] if filtered_docs else raw_docs[:10]
    
    def summarize_context(self, documents: List[Document], max_length: int = 4000) -> str:
        """Summarize long contexts to fit within token limits"""
        
        combined_text = "\n\n".join([doc.page_content for doc in documents])
        
        if len(combined_text) <= max_length:
            return combined_text
        
        # Use the LLM to summarize if content is too long
        summary_prompt = f"""
Please provide a comprehensive summary of the following text from the "Attention Is All You Need" paper, preserving all key technical information, concepts, and details:

{combined_text[:max_length]}

Comprehensive Summary:
"""
        
        try:
            summary_response = self.llm.predict(summary_prompt)
            return summary_response
        except Exception:
            # Fallback to truncation if summarization fails
            return combined_text[:max_length] + "... (truncated)"
    
    def refine_answer(self, question: str, initial_answer: str, additional_context: str) -> str:
        """Refine an answer with additional context using map-reduce approach"""
        
        refine_prompt = f"""
Given the following question and initial answer, please refine the answer using the additional context provided.
Make the answer more comprehensive while maintaining accuracy.

Question: {question}

Initial Answer: {initial_answer}

Additional Context: {additional_context}

Refined Answer:
"""
        
        try:
            refined_response = self.llm.predict(refine_prompt)
            return refined_response
        except Exception:
            return initial_answer  # Return original if refinement fails
