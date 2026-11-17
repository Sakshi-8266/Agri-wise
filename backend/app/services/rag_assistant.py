import os
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class RAGAssistantService:
    def __init__(self):
        self.documents = []
        self.vectorizer = None
        self.doc_vectors = None
        self._load_documents()

    def _load_documents(self):
        curr_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        json_path = os.path.join(curr_dir, "data", "agricultural_knowledge.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                self.documents = json.load(f)
        
        # Build TF-IDF search index
        corpus = [f"{doc['title']}. {doc['category']}. {doc['content']}" for doc in self.documents]
        if corpus:
            self.vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
            self.doc_vectors = self.vectorizer.fit_transform(corpus)

    def search_and_generate(self, query: str) -> dict:
        if not self.vectorizer or not self.documents:
            return {
                "response": "I am currently initializing the agronomic knowledge base. Please try again in a moment.",
                "sources": [],
                "disclaimer": "Agricultural assistant responses are based on curated reference material."
            }

        query_vector = self.vectorizer.transform([query])
        scores = cosine_similarity(query_vector, self.doc_vectors)[0]

        # Top relevant indices with score threshold
        top_indices = [i for i in scores.argsort()[::-1] if scores[i] > 0.08]

        if not top_indices:
            # Fallback when query is outside domain
            return {
                "response": (
                    "Rakshak searched the agricultural knowledge base, but could not find a sufficiently grounded document "
                    f"addressing '{query}'. For questions outside soil chemistry, irrigation scheduling, crop protection, "
                    "vermicomposting, or grain storage, please consult your regional Krishi Vigyan Kendra (KVK) or extension specialist."
                ),
                "sources": [],
                "disclaimer": "Grounding Safeguard: Rakshak does not fabricate answers when knowledge documents are missing."
            }

        # Build retrieved passages
        retrieved_sources = []
        context_parts = []
        for idx in top_indices[:3]:
            doc = self.documents[idx]
            score = round(float(scores[idx]), 2)
            retrieved_sources.append({
                "title": doc["title"],
                "category": doc["category"],
                "relevance_score": score,
                "snippet": doc["content"][:220] + "..."
            })
            context_parts.append(f"[{doc['title']} ({doc['source']})]: {doc['content']}")

        # Formulate grounded answer
        synthesized_answer = (
            f"Based on verified agronomic standards from {retrieved_sources[0]['title']}:\n\n"
            f"{self.documents[top_indices[0]]['content']}\n\n"
        )
        if len(top_indices) > 1:
            synthesized_answer += (
                f"Additionally, regarding {retrieved_sources[1]['category']} ({retrieved_sources[1]['title']}):\n"
                f"{self.documents[top_indices[1]]['content'][:250]}...\n\n"
            )
        synthesized_answer += "Key Takeaway: Always tailor timing and rates to your specific soil test report and localized micro-climate."

        return {
            "response": synthesized_answer,
            "sources": retrieved_sources,
            "disclaimer": "Source Attribution: Answers are derived from verified agronomy manuals and scientific handbooks."
        }

rag_service = RAGAssistantService()
