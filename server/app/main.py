from fastapi import FastAPI
from agent.llm_client import LLMClient


app = FastAPI()

@app.get("/")
def read_root():
    llm_client = LLMClient()
    response = llm_client.generate_response([{"role": "user", "content": "test query"}])
    return {"message": response}

@app.post("/generate_story")
def generate_story(request: dict):
    return {"message": "Hello World"}

@app.post("/continue_story")
def continue_story(request: dict):
    return {"message": "continue story"}

@app.post("/generate_plot")
def generate_plot(request: dict):
    return {"message": "generate plot"}