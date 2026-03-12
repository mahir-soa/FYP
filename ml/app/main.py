from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
import json

from app.database import get_db
from app.models import Expense, Income, Budget, Subscription, UserPersona, Nudge
from app.features.extract import extract_features
from app.services.persona_service import predict_persona, predict_persona_full
from app.services.risk_service import predict_risk
from app.services.nudge_service import generate_nudges

app = FastAPI(title="Nudge ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MIN_EXPENSES = 30
MIN_DAYS = 14


def get_user_data(db: Session, user_id: int):
    expenses = db.query(Expense).filter(Expense.user_id == user_id).order_by(Expense.date.desc()).all()
    incomes = db.query(Income).filter(Income.user_id == user_id).all()
    budgets = db.query(Budget).filter(Budget.user_id == user_id).order_by(Budget.month.desc()).all()
    subscriptions = db.query(Subscription).filter(Subscription.user_id == user_id).all()
    return expenses, incomes, budgets, subscriptions


def check_minimum_data(expenses):
    if len(expenses) < MIN_EXPENSES:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least {MIN_EXPENSES} expenses to analyse. Currently have {len(expenses)}."
        )

    dates = sorted(set(e.date for e in expenses if e.date))
    if len(dates) >= 2:
        from datetime import datetime as dt
        first = dt.strptime(dates[0][:10], '%Y-%m-%d')
        last = dt.strptime(dates[-1][:10], '%Y-%m-%d')
        span = (last - first).days
        if span < MIN_DAYS:
            raise HTTPException(
                status_code=400,
                detail=f"Need at least {MIN_DAYS} days of data. Currently have {span} days."
            )


@app.post("/api/ml/analyse/{user_id}")
def analyse_user(user_id: int, db: Session = Depends(get_db)):
    expenses, incomes, budgets, subscriptions = get_user_data(db, user_id)
    check_minimum_data(expenses)

    features = extract_features(expenses, budgets, subscriptions, incomes)
    if not features:
        raise HTTPException(status_code=400, detail="Could not extract features")

    persona_result = predict_persona_full(features, expenses, budgets, subscriptions, incomes)
    risk_result = predict_risk(features)
    nudge_list = generate_nudges(
        features, persona_result, risk_result,
        discipline=persona_result.get('discipline'),
        spider=persona_result.get('spider_axes'),
    )

    now = datetime.now()
    confidence_data = persona_result.get('confidence_data', {})

    existing = db.query(UserPersona).filter(UserPersona.user_id == user_id).first()
    if existing:
        existing.persona_type = persona_result['persona_type']
        existing.persona_primary = persona_result['persona_primary']
        existing.confidence_score = persona_result['confidence']
        existing.confidence_level = confidence_data.get('level', '')
        existing.confidence_data = json.dumps(confidence_data)
        existing.spider_axes = json.dumps(persona_result.get('spider_axes', {}))
        existing.discipline_data = json.dumps(persona_result.get('discipline', {}))
        existing.emotional_spender_flag = persona_result['emotional_spender_flag']
        existing.feature_snapshot = json.dumps(features)
        existing.calculated_at = now
        existing.updated_at = now
    else:
        persona_entity = UserPersona(
            user_id=user_id,
            persona_type=persona_result['persona_type'],
            persona_primary=persona_result['persona_primary'],
            confidence_score=persona_result['confidence'],
            confidence_level=confidence_data.get('level', ''),
            confidence_data=json.dumps(confidence_data),
            spider_axes=json.dumps(persona_result.get('spider_axes', {})),
            discipline_data=json.dumps(persona_result.get('discipline', {})),
            emotional_spender_flag=persona_result['emotional_spender_flag'],
            feature_snapshot=json.dumps(features),
            calculated_at=now,
            created_at=now,
            updated_at=now,
        )
        db.add(persona_entity)

    for nudge_data in nudge_list:
        nudge_entity = Nudge(
            user_id=user_id,
            type=nudge_data['type'],
            nudge_type=nudge_data.get('nudge_type'),
            trigger=nudge_data.get('trigger'),
            timing=nudge_data.get('timing'),
            severity=nudge_data.get('severity'),
            confidence=nudge_data.get('confidence'),
            title=nudge_data['title'],
            message=nudge_data['message'],
            priority=nudge_data['priority'],
            related_entity_type=nudge_data.get('related_entity_type'),
            expires_at=datetime.fromisoformat(nudge_data['expires_at']) if nudge_data.get('expires_at') else None,
            created_at=now,
        )
        db.add(nudge_entity)

    db.commit()

    return {
        'user_id': user_id,
        'persona': persona_result,
        'risk': risk_result,
        'nudges_generated': len(nudge_list),
        'analysed_at': now.isoformat(),
    }


@app.get("/api/ml/persona/{user_id}")
def get_persona(user_id: int, db: Session = Depends(get_db)):
    persona = db.query(UserPersona).filter(UserPersona.user_id == user_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="No persona found. Run /api/ml/analyse first.")

    feature_snapshot = {}
    if persona.feature_snapshot:
        try:
            feature_snapshot = json.loads(persona.feature_snapshot)
        except json.JSONDecodeError:
            pass

    result = predict_persona(feature_snapshot) if feature_snapshot else {}

    confidence_data = {}
    if persona.confidence_data:
        try:
            confidence_data = json.loads(persona.confidence_data)
        except json.JSONDecodeError:
            pass

    spider_axes = {}
    if persona.spider_axes:
        try:
            spider_axes = json.loads(persona.spider_axes)
        except json.JSONDecodeError:
            pass

    discipline = {}
    if persona.discipline_data:
        try:
            discipline = json.loads(persona.discipline_data)
        except json.JSONDecodeError:
            pass

    return {
        'user_id': user_id,
        'persona_type': persona.persona_type,
        'persona_primary': persona.persona_primary or persona.persona_type,
        'persona_label': result.get('persona_label', persona.persona_type),
        'description': result.get('description', ''),
        'confidence': persona.confidence_score,
        'confidence_level': persona.confidence_level or confidence_data.get('level', ''),
        'confidence_data': confidence_data,
        'spider_axes': spider_axes,
        'discipline': discipline,
        'emotional_spender_flag': persona.emotional_spender_flag,
        'top_features': result.get('top_features', []),
        'calculated_at': persona.calculated_at.isoformat() if persona.calculated_at else None,
    }


@app.get("/api/ml/risk/{user_id}")
def get_risk(user_id: int, db: Session = Depends(get_db)):
    persona = db.query(UserPersona).filter(UserPersona.user_id == user_id).first()
    if not persona or not persona.feature_snapshot:
        raise HTTPException(status_code=404, detail="No analysis found. Run /api/ml/analyse first.")

    features = json.loads(persona.feature_snapshot)
    risk_result = predict_risk(features)

    return {
        'user_id': user_id,
        **risk_result,
    }


@app.get("/api/ml/nudges/{user_id}")
def get_nudges(user_id: int, db: Session = Depends(get_db)):
    now = datetime.now()
    nudges = (
        db.query(Nudge)
        .filter(
            Nudge.user_id == user_id,
            Nudge.is_dismissed == False,
        )
        .order_by(
            Nudge.priority.desc(),
            Nudge.created_at.desc(),
        )
        .all()
    )

    active = []
    for n in nudges:
        if n.expires_at and n.expires_at < now:
            continue
        active.append({
            'id': n.id,
            'type': n.type,
            'nudge_type': n.nudge_type,
            'trigger': n.trigger,
            'timing': n.timing,
            'severity': n.severity,
            'confidence': n.confidence,
            'title': n.title,
            'message': n.message,
            'priority': n.priority,
            'is_read': n.is_read,
            'related_entity_type': n.related_entity_type,
            'related_entity_id': n.related_entity_id,
            'expires_at': n.expires_at.isoformat() if n.expires_at else None,
            'created_at': n.created_at.isoformat() if n.created_at else None,
        })

    return {
        'user_id': user_id,
        'count': len(active),
        'nudges': active,
    }


@app.get("/api/ml/health")
def health():
    return {"status": "ok", "service": "nudge-ml"}
