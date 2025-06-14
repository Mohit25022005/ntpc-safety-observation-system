# similarity_service.py
from fastapi import FastAPI
from sentence_transformers import SentenceTransformer, util
from pydantic import BaseModel
import uvicorn

app = FastAPI()
model = SentenceTransformer("all-MiniLM-L6-v2")

class Report(BaseModel):
    id: str
    text: str

class SimilarityRequest(BaseModel):
    new_text: str
    existing: list[Report]

SIMILARITY_THRESHOLD = 0.85  # You can tweak this threshold

@app.post("/similarity")
async def compute_similarity(request: SimilarityRequest):
    new_embedding = model.encode(request.new_text, convert_to_tensor=True)
    similarities = []

    for report in request.existing:
        existing_embedding = model.encode(report.text, convert_to_tensor=True)
        score = util.cos_sim(new_embedding, existing_embedding).item()
        if score >= SIMILARITY_THRESHOLD:
            similarities.append({
                "id": report.id,
                "score": round(score, 4)
            })

    similarities.sort(key=lambda x: x["score"], reverse=True)

    return {
        "is_duplicate": len(similarities) > 0,
        "similar_matches": similarities
    }

if __name__ == "__main__":
    uvicorn.run("similarity_service:app", host="0.0.0.0", port=8000, reload=True)
