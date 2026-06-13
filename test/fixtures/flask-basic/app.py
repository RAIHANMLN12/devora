from flask import Flask

app = Flask(__name__)


@app.route("/health")
def health():
    return {"status": "ok"}


@app.route("/users", methods=["GET"])
def get_users():
    return {"users": []}


@app.route("/users", methods=["POST"])
def create_user():
    return {"id": 1}


@app.route("/users/<int:user_id>")
def get_user(user_id):
    return {"id": user_id, "name": "John"}
