from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text
from app.database import Base


class Expense(Base):
    __tablename__ = 'expenses'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    date = Column(String)
    time = Column(String)
    description = Column(String)
    amount = Column(Float)
    category = Column(String)
    mood = Column(String)


class Income(Base):
    __tablename__ = 'incomes'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    source = Column(String)
    amount = Column(Float)
    date = Column(String)
    frequency = Column(String)


class Budget(Base):
    __tablename__ = 'budgets'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    month = Column(String)
    total_budget = Column(Float)
    category_limits = Column(String(2000))
    safe_to_spend = Column(Float)


class Subscription(Base):
    __tablename__ = 'subscriptions'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    name = Column(String)
    cost = Column(Float)
    billing_cycle = Column(String)
    next_payment_date = Column(String)
    last_used_date = Column(String)
    status = Column(String)
    provider_key = Column(String)
    category = Column(String)


class UserPersona(Base):
    __tablename__ = 'user_persona'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, unique=True)
    persona_type = Column(String)
    persona_primary = Column(String)
    confidence_score = Column(Float)
    confidence_level = Column(String)
    confidence_data = Column(String(2000))
    spider_axes = Column(String(1000))
    discipline_data = Column(String(2000))
    emotional_spender_flag = Column(Boolean, default=False)
    feature_snapshot = Column(Text)
    calculated_at = Column(DateTime)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)


class Nudge(Base):
    __tablename__ = 'nudge'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    type = Column(String)
    nudge_type = Column(String)
    trigger = Column(String(500))
    timing = Column(String)
    severity = Column(String)
    confidence = Column(Float)
    title = Column(String(200))
    message = Column(Text)
    priority = Column(String, default='MEDIUM')
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    related_entity_type = Column(String)
    related_entity_id = Column(Integer)
    expires_at = Column(DateTime)
    created_at = Column(DateTime)
