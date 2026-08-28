"""
DEMO SCRIPT — run this to PROVE that SQLAlchemy (ORM) is generating
real SQL under the hood, even though we never wrote SQL by hand.

Run from the backend/ folder:
    python app/demo_show_sql.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import models
from app.database import engine, SessionLocal

db = SessionLocal()

# The exact same query used in routers/auth.py to find a user by email
query = db.query(models.User).filter(models.User.email == "test@gmail.com")

print("=" * 60)
print("Python code we wrote:")
print('  db.query(models.User).filter(models.User.email == "test@gmail.com")')
print()
print("Actual SQL SQLAlchemy generates and sends to the database:")
print("=" * 60)
print(query.statement.compile(engine, compile_kwargs={"literal_binds": True}))
print("=" * 60)

db.close()
