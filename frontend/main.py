from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Frontend Service")

FRONTEND_DIR = Path(__file__).resolve().parent


def _serve_html(filename: str) -> FileResponse:
    return FileResponse(FRONTEND_DIR / filename)


@app.get("/")
def home() -> FileResponse:
    return _serve_html("index.html")


@app.get("/login")
def login() -> FileResponse:
    return _serve_html("login.html")


@app.get("/signup")
def signup() -> FileResponse:
    return _serve_html("signup.html")


@app.get("/products")
def products() -> FileResponse:
    return _serve_html("products.html")


@app.get("/product")
def product() -> FileResponse:
    return _serve_html("product.html")


@app.get("/cart")
def cart() -> FileResponse:
    return _serve_html("cart.html")


@app.get("/checkout")
def checkout() -> FileResponse:
    return _serve_html("checkout.html")


@app.get("/orders")
def orders() -> FileResponse:
    return _serve_html("orders.html")


@app.get("/admin")
def admin() -> FileResponse:
    return _serve_html("admin.html")


app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend-static")
