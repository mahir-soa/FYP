import pandas as pd
import numpy as np
import json
from datetime import datetime, timedelta

CATEGORIES = ['Food', 'Travel', 'Leisure', 'Education', 'Other']
MOODS = ['Happy', 'Sad', 'Stressed', 'Neutral', 'Excited']


def extract_features(expenses, budgets, subscriptions, incomes):
    if not expenses:
        return None

    df = pd.DataFrame([{
        'amount': e.amount,
        'category': e.category,
        'mood': e.mood,
        'date': pd.to_datetime(e.date),
    } for e in expenses])

    df['dow'] = df['date'].dt.dayofweek
    df['is_weekend'] = df['dow'] >= 5
    df['month'] = df['date'].dt.to_period('M').astype(str)

    current_month = df['month'].max()
    month_df = df[df['month'] == current_month]
    if len(month_df) == 0:
        month_df = df

    total_spend = month_df['amount'].sum()

    features = {
        'total_spend': round(total_spend, 2),
        'txn_count': len(month_df),
        'avg_txn': round(month_df['amount'].mean(), 2),
        'max_txn': round(month_df['amount'].max(), 2),
        'std_txn': round(month_df['amount'].std(), 2) if len(month_df) > 1 else 0,
    }

    for cat in CATEGORIES:
        cat_sum = month_df[month_df['category'] == cat]['amount'].sum()
        features[f'pct_{cat.lower()}'] = round(cat_sum / max(total_spend, 0.01), 4)

    weekend_spend = month_df[month_df['is_weekend']]['amount'].sum()
    weekday_spend = month_df[~month_df['is_weekend']]['amount'].sum()
    features['weekend_ratio'] = round(weekend_spend / max(weekday_spend, 0.01), 4)

    for mood in MOODS:
        mood_txns = month_df[month_df['mood'] == mood]
        features[f'{mood.lower()}_spend_avg'] = round(mood_txns['amount'].mean(), 2) if len(mood_txns) > 0 else 0
        features[f'{mood.lower()}_txn_count'] = len(mood_txns)

    mood_totals = month_df.groupby('mood')['amount'].sum()
    features['dominant_mood'] = mood_totals.idxmax() if len(mood_totals) > 0 else 'Neutral'

    if budgets:
        latest_budget = budgets[0]
        try:
            limits = json.loads(latest_budget.category_limits)
        except (json.JSONDecodeError, TypeError):
            limits = {}

        for cat in CATEGORIES:
            actual = month_df[month_df['category'] == cat]['amount'].sum()
            budget = limits.get(cat, 0)
            features[f'adherence_{cat.lower()}'] = round(actual / max(budget, 0.01), 4)
    else:
        for cat in CATEGORIES:
            features[f'adherence_{cat.lower()}'] = 0

    sub_count = len(subscriptions) if subscriptions else 0
    features['sub_count'] = sub_count
    if subscriptions and sub_count > 0:
        features['sub_total_cost'] = round(sum(s.cost for s in subscriptions), 2)
        cutoff = datetime.now() - timedelta(days=60)
        inactive = sum(1 for s in subscriptions if s.last_used_date and pd.to_datetime(s.last_used_date) < cutoff)
        features['inactive_ratio'] = round(inactive / sub_count, 4)
    else:
        features['sub_total_cost'] = 0
        features['inactive_ratio'] = 0

    monthly_totals = df.groupby('month')['amount'].sum().sort_index()
    if len(monthly_totals) > 1:
        slope = np.polyfit(range(len(monthly_totals)), monthly_totals.values, 1)[0]
        features['spending_trend'] = round(slope, 2)
    else:
        features['spending_trend'] = 0

    features['debt_to_income_ratio'] = 0
    features['credit_score'] = 0
    features['savings_to_income_ratio'] = 0

    if incomes:
        monthly_income = incomes[0].amount
        features['total_income'] = monthly_income
    else:
        features['total_income'] = 0

    monthly_spend_values = df.groupby('month')['amount'].sum()
    features['monthly_spend_mean'] = round(monthly_spend_values.mean(), 2) if len(monthly_spend_values) > 0 else 0
    features['monthly_spend_std'] = round(monthly_spend_values.std(), 2) if len(monthly_spend_values) > 1 else 0

    cat_pcts = [features.get(f'pct_{cat.lower()}', 0) for cat in CATEGORIES]
    features['hhi_index'] = round(sum(p ** 2 for p in cat_pcts), 4)

    daily_totals = month_df.groupby(month_df['date'].dt.date)['amount'].sum()
    features['daily_spend_mean'] = round(daily_totals.mean(), 2) if len(daily_totals) > 0 else 0
    features['daily_spend_std'] = round(daily_totals.std(), 2) if len(daily_totals) > 1 else 0
    features['days_with_expenses'] = len(daily_totals)

    return features


def extract_features_for_window(expenses, budgets, subscriptions, incomes, days):
    if not expenses:
        return None

    cutoff = datetime.now() - timedelta(days=days)
    windowed = [e for e in expenses if e.date and pd.to_datetime(e.date) >= cutoff]

    if len(windowed) < 5:
        return None

    return extract_features(windowed, budgets, subscriptions, incomes)
