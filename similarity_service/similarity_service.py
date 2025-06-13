# similarity_service.py
from fastapi import FastAPI, Request
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

@app.post("/similarity")
async def compute_similarity(request: SimilarityRequest):
    new_embedding = model.encode(request.new_text, convert_to_tensor=True)
    similarities = []

    for report in request.existing:
        existing_embedding = model.encode(report.text, convert_to_tensor=True)
        score = util.cos_sim(new_embedding, existing_embedding).item()
        similarities.append({
            "id": report.id,
            "score": score
        })

    return {"similarities": similarities}
