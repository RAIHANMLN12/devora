from fastapi import FastAPI, APIRouter

app = FastAPI()
router = APIRouter()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/users")
async def get_users():
    return {"users": []}


@router.post("/users")
async def create_user():
    return {"id": 1}


@router.get("/users/{user_id}")
async def get_user(user_id: int):
    return {"id": user_id, "name": "John"}


@router.put("/users/{user_id}")
async def update_user(user_id: int):
    return {"id": user_id, "name": "Updated"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: int):
    return {"message": "deleted"}
