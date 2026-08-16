from passlib.context import CryptContext

# Use pbkdf2_sha256 for portability across local/dev/deploy environments.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    return pwd_context.verify(plain_pin, hashed_pin)

def get_pin_hash(pin: str) -> str:
    return pwd_context.hash(pin)
