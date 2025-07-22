from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Enum
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from pii_scanner.core.models import PIIResult, PIIType, RiskLevel

DATABASE_URL = sqlite:///pii_results.db

Base = declarative_base()

class PIIResultDB(Base):
    __tablename__ = pii_results

    id = Column(Integer, primary_key=True, index=True)
    sample = Column(String, nullable=False)
    pii_type = Column(Enum(PIIType), nullable=False)
    confidence_score = Column(Float, nullable=True)
    risk_level = Column(Enum(RiskLevel), nullable=False)
    model = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    source = Column(String, nullable=False)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def save_results(results: list[PIIResult]):
    db = SessionLocal()
    try:
        for result in results:
            db_result = PIIResultDB(**result.dict())
            db.add(db_result)
        db.commit()
    finally:
        db.close()

