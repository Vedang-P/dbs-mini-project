from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=6, max_length=255)
    password: str = Field(min_length=6, max_length=200)
    phone: str | None = Field(default=None, max_length=20)


class LoginRequest(BaseModel):
    email: str = Field(min_length=6, max_length=255)
    password: str = Field(min_length=6, max_length=200)


class AddToCartRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class PlaceOrderRequest(BaseModel):
    user_id: int | None = None


class CancelOrderRequest(BaseModel):
    user_id: int | None = None


class LegacyAddToCartRequest(BaseModel):
    user_id: int
    product_id: int
    quantity: int = Field(gt=0)


class UpdateCartItemRequest(BaseModel):
    quantity: int = Field(gt=0)
