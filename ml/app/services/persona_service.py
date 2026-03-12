import joblib
import numpy as np
import json
import os
from datetime import datetime, timedelta

import pandas as pd

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'trained_models')

PERSONA_LABELS = {
    'IMPULSIVE_SPENDER': 'Impulsive Spender',
    'CAUTIOUS_SAVER': 'Cautious Saver',
    'WEEKEND_SPLURGER': 'Weekend Splurger',
    'SUBSCRIPTION_HOARDER': 'Subscription Hoarder',
    'BALANCED_BUDGETER': 'Balanced Budgeter',
    'VOLATILE_SPENDER': 'Volatile Spender',
    'DISCIPLINED_PLANNER': 'Disciplined Planner',
    'WEEKEND_SPIKER': 'Weekend Spiker',
    'CATEGORY_FOCUSED_SPENDER': 'Category-Focused Spender',
}

PERSONA_DESCRIPTIONS = {
    'IMPULSIVE_SPENDER': 'You tend to make spontaneous purchases with high spending variance. Stress seems to drive some of your spending.',
    'CAUTIOUS_SAVER': "You're consistent with your spending and rarely go over budget. Great discipline!",
    'WEEKEND_SPLURGER': 'Your spending spikes on weekends. Being mindful of weekend habits could help you save more.',
    'SUBSCRIPTION_HOARDER': 'You have multiple subscriptions, some of which you may not be using regularly.',
    'BALANCED_BUDGETER': "You maintain an even spread across categories and stay close to your budget targets.",
    'VOLATILE_SPENDER': 'Your spending fluctuates a lot from day to day. Building consistent habits could stabilise your finances.',
    'DISCIPLINED_PLANNER': 'You keep spending well within budget across most categories. Excellent financial discipline!',
    'WEEKEND_SPIKER': 'Your spending spikes noticeably on weekends. Planning weekend activities in advance could help.',
    'CATEGORY_FOCUSED_SPENDER': 'Most of your spending is concentrated in one category. Diversifying could improve your financial balance.',
}

CATEGORIES = ['Food', 'Travel', 'Leisure', 'Education', 'Other']


def load_kmeans():
    path = os.path.join(MODEL_DIR, 'persona_kmeans.pkl')
    return joblib.load(path)


def _predict_base_persona(features):
    data = load_kmeans()
    model = data['model']
    scaler = data['scaler']
    feature_names = data['features']
    cluster_map = data['cluster_to_persona']

    X = np.array([[features.get(f, 0) for f in feature_names]])
    X_scaled = scaler.transform(X)

    cluster = model.predict(X_scaled)[0]
    distances = model.transform(X_scaled)[0]

    max_dist = distances.max()
    confidence = 1 - (distances[cluster] / max_dist) if max_dist > 0 else 0.5

    persona_type = cluster_map.get(int(cluster), 'BALANCED_BUDGETER')

    centroid = model.cluster_centers_[cluster]
    diffs = np.abs(X_scaled[0] - centroid)
    top_indices = np.argsort(diffs)[:3]
    top_features = [feature_names[i] for i in top_indices]

    emotional_flag = (
        features.get('stressed_spend_avg', 0) > features.get('neutral_spend_avg', 0) or
        features.get('stressed_txn_count', 0) > features.get('neutral_txn_count', 0) * 0.5
    )

    return {
        'persona_type': persona_type,
        'persona_label': PERSONA_LABELS.get(persona_type, 'Unknown'),
        'description': PERSONA_DESCRIPTIONS.get(persona_type, ''),
        'confidence': round(float(confidence), 4),
        'emotional_spender_flag': emotional_flag,
        'top_features': top_features,
        'cluster_fit': round(float(confidence) * 100, 1),
    }


def refine_persona(base_type, features):
    stressed_avg = features.get('stressed_spend_avg', 0)
    sad_avg = features.get('sad_spend_avg', 0)
    neutral_avg = features.get('neutral_spend_avg', 0.01)
    emotional_ratio = (stressed_avg + sad_avg) / (2 * max(neutral_avg, 0.01))
    std_txn = features.get('std_txn', 0)
    avg_txn = features.get('avg_txn', 0.01)

    if base_type != 'CAUTIOUS_SAVER':
        cat_pcts = [features.get(f'pct_{cat.lower()}', 0) for cat in CATEGORIES]
        if any(p > 0.50 for p in cat_pcts):
            return 'CATEGORY_FOCUSED_SPENDER'

    if base_type == 'IMPULSIVE_SPENDER':
        if emotional_ratio >= 1.2:
            return 'IMPULSIVE_SPENDER'
        else:
            if std_txn > avg_txn * 0.5:
                return 'VOLATILE_SPENDER'
            return 'IMPULSIVE_SPENDER'

    if base_type in ('CAUTIOUS_SAVER', 'BALANCED_BUDGETER'):
        adherence_cats = [features.get(f'adherence_{cat.lower()}', 0) for cat in CATEGORIES]
        under_budget_count = sum(1 for a in adherence_cats if 0 < a < 0.9)
        if under_budget_count >= 3 and std_txn < avg_txn * 0.4:
            return 'DISCIPLINED_PLANNER'

    if base_type == 'WEEKEND_SPLURGER':
        return 'WEEKEND_SPIKER'

    return base_type


def compute_spider_axes(features):
    avg_txn = max(features.get('avg_txn', 0.01), 0.01)
    std_txn = features.get('std_txn', 0)
    max_txn = features.get('max_txn', 0)

    impulse = min(100, (std_txn / avg_txn) * 50 + (max_txn / avg_txn) * 10)

    spending_trend = features.get('spending_trend', 0)
    total_spend = max(features.get('total_spend', 0.01), 0.01)
    volatility = min(100, (abs(spending_trend) / total_spend) * 500)

    adherence_vals = [features.get(f'adherence_{cat.lower()}', 0) for cat in CATEGORIES]
    valid_adherence = [a for a in adherence_vals if a > 0]
    avg_adherence = sum(valid_adherence) / len(valid_adherence) if valid_adherence else 0.8
    budget_discipline = 100 - max(0, avg_adherence - 0.8) * 200
    budget_discipline = max(0, min(100, budget_discipline))

    weekend_ratio = features.get('weekend_ratio', 0)
    weekend_bias = min(100, weekend_ratio * 40)

    stressed_avg = features.get('stressed_spend_avg', 0)
    sad_avg = features.get('sad_spend_avg', 0)
    neutral_avg = max(features.get('neutral_spend_avg', 0.01), 0.01)
    emotional_influence = ((stressed_avg + sad_avg) / (2 * neutral_avg) - 0.5) * 100
    emotional_influence = max(0, min(100, emotional_influence))

    hhi = features.get('hhi_index', 0.20)
    category_concentration = (hhi - 0.20) / 0.80 * 100
    category_concentration = max(0, min(100, category_concentration))

    return {
        'impulse': round(impulse, 1),
        'volatility': round(volatility, 1),
        'budget_discipline': round(budget_discipline, 1),
        'weekend_bias': round(weekend_bias, 1),
        'emotional_influence': round(emotional_influence, 1),
        'category_concentration': round(category_concentration, 1),
    }


def compute_confidence(features, expenses, budgets, subscriptions, incomes):
    from app.features.extract import extract_features_for_window

    cutoff_60 = datetime.now() - timedelta(days=60)
    recent_expenses = [e for e in expenses if e.date and pd.to_datetime(e.date) >= cutoff_60]
    data_sufficiency = min(100, (len(recent_expenses) / 60) * 100)

    windows = [30, 60, 90]
    window_types = []
    for w in windows:
        w_features = extract_features_for_window(expenses, budgets, subscriptions, incomes, w)
        if w_features:
            try:
                result = _predict_base_persona(w_features)
                window_types.append(result['persona_type'])
            except Exception:
                pass

    if len(window_types) >= 2:
        most_common = max(set(window_types), key=window_types.count)
        agreement = window_types.count(most_common) / len(window_types)
        stability = agreement * 100
    else:
        stability = 50

    base_result = _predict_base_persona(features)
    cluster_fit = base_result.get('cluster_fit', 50)

    score = round(data_sufficiency * 0.30 + stability * 0.35 + cluster_fit * 0.35, 1)
    level = 'High' if score >= 70 else 'Medium' if score >= 40 else 'Low'

    return {
        'score': score,
        'level': level,
        'data_sufficiency': round(data_sufficiency, 1),
        'stability': round(stability, 1),
        'cluster_fit': round(cluster_fit, 1),
    }


def compute_discipline(features, expenses, budgets):
    adherence_vals = [features.get(f'adherence_{cat.lower()}', 0) for cat in CATEGORIES]
    valid_adherence = [a for a in adherence_vals if a > 0]
    avg_adherence = sum(valid_adherence) / len(valid_adherence) if valid_adherence else 1.0
    adherence_score = max(0, min(50, (1.0 - max(0, avg_adherence - 1.0)) * 50))

    total_budget = 0
    if budgets:
        total_budget = budgets[0].total_budget or 0
    daily_budget = total_budget / 30 if total_budget > 0 else float('inf')

    df_expenses = pd.DataFrame([{
        'amount': e.amount,
        'date': pd.to_datetime(e.date).date(),
    } for e in expenses if e.date])

    streak_days = 0
    streak_weeks = 0
    consistency_score = 0

    if len(df_expenses) > 0:
        daily_totals = df_expenses.groupby('date')['amount'].sum().sort_index()
        today = datetime.now().date()

        for i in range(90):
            d = today - timedelta(days=i)
            day_spend = daily_totals.get(d, 0)
            if day_spend <= daily_budget * 1.1:
                streak_days += 1
            else:
                break

        weekly_budget = total_budget / 4 if total_budget > 0 else float('inf')
        df_expenses_copy = df_expenses.copy()
        df_expenses_copy['date'] = pd.to_datetime(df_expenses_copy['date'])
        df_expenses_copy['week'] = df_expenses_copy['date'].dt.isocalendar().week
        df_expenses_copy['year'] = df_expenses_copy['date'].dt.year

        now = datetime.now()
        four_weeks_ago = now - timedelta(weeks=4)
        recent_exp = df_expenses_copy[df_expenses_copy['date'] >= four_weeks_ago]
        if len(recent_exp) > 0:
            weekly_totals = recent_exp.groupby(['year', 'week'])['amount'].sum()
            streak_weeks = sum(1 for _, total in weekly_totals.items() if total <= weekly_budget * 1.1)

        consistency_score = min(30, streak_days * 1.0)

    daily_std = features.get('daily_spend_std', 0)
    daily_mean = max(features.get('daily_spend_mean', 0.01), 0.01)
    cv = daily_std / daily_mean
    variance_score = max(0, min(20, (1 - min(cv, 1)) * 20))

    discipline_score = round(adherence_score + consistency_score + variance_score, 1)

    trend_val = features.get('spending_trend', 0)
    if trend_val < -5:
        trend = 'improving'
    elif trend_val > 5:
        trend = 'worsening'
    else:
        trend = 'stable'

    if discipline_score >= 75:
        feedback = f"Excellent discipline! You've kept spending on track for {streak_days} days in a row."
    elif discipline_score >= 50:
        feedback = f"Good progress — you're building solid habits. Current streak: {streak_days} days."
    elif discipline_score >= 25:
        feedback = f"Room for improvement. Try to stay within budget each day to build your streak."
    else:
        feedback = "Your spending is quite variable. Start small — aim to stay in budget for 3 consecutive days."

    return {
        'discipline_score': discipline_score,
        'streak_days_in_budget': streak_days,
        'streak_weeks_stable': streak_weeks,
        'trend': trend,
        'feedback_message': feedback,
    }


def predict_persona(features):
    return _predict_base_persona(features)


def predict_persona_full(features, expenses, budgets, subscriptions, incomes):
    base = _predict_base_persona(features)

    refined_type = refine_persona(base['persona_type'], features)

    spider = compute_spider_axes(features)
    confidence = compute_confidence(features, expenses, budgets, subscriptions, incomes)
    discipline = compute_discipline(features, expenses, budgets)

    return {
        'persona_type': base['persona_type'],
        'persona_primary': refined_type,
        'persona_label': PERSONA_LABELS.get(refined_type, base['persona_label']),
        'description': PERSONA_DESCRIPTIONS.get(refined_type, base['description']),
        'confidence': base['confidence'],
        'confidence_data': confidence,
        'spider_axes': spider,
        'discipline': discipline,
        'emotional_spender_flag': base['emotional_spender_flag'],
        'top_features': base['top_features'],
    }
