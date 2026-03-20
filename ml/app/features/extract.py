import pandas as pd
import numpy as np
import json
from datetime import datetime, timedelta

CATEGORIES = ['Food', 'Travel', 'Leisure', 'Education', 'Other']
MOODS = ['Happy', 'Sad', 'Stressed', 'Neutral', 'Excited']

# App categories for clustering (matches Sparkov mapping)
CLUSTERING_CATEGORIES = ['Food', 'Travel', 'Leisure', 'Health', 'Other']
CLUSTERING_CATEGORY_MAP = {
    'Food': 'food', 'Travel': 'travel', 'Leisure': 'leisure',
    'Health': 'health', 'Education': 'health', 'Other': 'other',
}

MIN_CLUSTERING_TXNS = 10       # Under 10: truly insufficient, return None
PROVISIONAL_TXNS = 20          # 10-19: provisional persona
FULL_UNLOCK_DAYS = 14          # 20+ txns AND 14+ day spread: full unlock


def extract_clustering_features(expenses):
    if not expenses or len(expenses) < MIN_CLUSTERING_TXNS:
        return None

    df = pd.DataFrame([{
        'amount': e.amount,
        'category': e.category,
        'date': pd.to_datetime(e.date),
        'description': getattr(e, 'description', '') or '',
    } for e in expenses])

    df['hour'] = df['date'].dt.hour
    df['dow'] = df['date'].dt.dayofweek
    df['month'] = df['date'].dt.to_period('M')
    df['is_weekend'] = df['dow'] >= 5

    # Late night: check if timestamps have real hours (not all midnight)
    has_real_hours = (df['hour'] != 0).any()
    if has_real_hours:
        df['is_late_night'] = ((df['hour'] >= 22) | (df['hour'] < 5))
    else:
        df['is_late_night'] = False

    # Map app categories to clustering categories
    df['cluster_cat'] = df['category'].map(CLUSTERING_CATEGORY_MAP).fillna('other')

    n_txn = len(df)
    active_months = df['month'].nunique()
    total_spend = df['amount'].sum()

    if total_spend <= 0:
        return None

    # Spend level & volatility
    mean_spend = df['amount'].mean()
    std_spend = df['amount'].std() if n_txn > 1 else 0.0
    spend_cv = std_spend / mean_spend if mean_spend > 0 else 0.0
    txn_frequency = n_txn / max(active_months, 1)

    # Timing features
    weekend_spend = df[df['is_weekend']]['amount'].sum()
    weekend_ratio = weekend_spend / total_spend

    late_night_spend = df[df['is_late_night']]['amount'].sum()
    late_night_ratio = late_night_spend / total_spend

    # Category percentages (4 of 5, pct_other dropped)
    cat_spend = df.groupby('cluster_cat')['amount'].sum()
    pct = {}
    for cat in ['food', 'travel', 'leisure', 'health']:
        pct[cat] = cat_spend.get(cat, 0) / total_spend

    # Merchant diversity (use description as proxy for merchant)
    unique_descriptions = df['description'].nunique()
    merchant_diversity = unique_descriptions / n_txn if n_txn > 0 else 0.0

    # Large transaction ratio
    p75 = df['amount'].quantile(0.75)
    large_txn_spend = df[df['amount'] > p75]['amount'].sum()
    large_txn_ratio = large_txn_spend / total_spend

    # Monthly consistency
    monthly_totals = df.groupby('month')['amount'].sum().sort_index()
    if len(monthly_totals) > 1:
        monthly_mean = monthly_totals.mean()
        monthly_std = monthly_totals.std()
        monthly_spend_cv = monthly_std / monthly_mean if monthly_mean > 0 else 0.0
    else:
        monthly_spend_cv = 0.0

    # Transaction regularity
    dates_sorted = df['date'].sort_values()
    if len(dates_sorted) > 1:
        gaps = dates_sorted.diff().dropna().dt.total_seconds() / 86400
        gap_std = gaps.std()
        txn_regularity = 1.0 / (1.0 + gap_std)
    else:
        txn_regularity = 0.0

    # Spend trend
    if len(monthly_totals) > 1:
        x = np.arange(len(monthly_totals))
        spend_trend = np.polyfit(x, monthly_totals.values, 1)[0]
    else:
        spend_trend = 0.0

    # Tiered unlock:
    #   <10 txns: returned None above (insufficient)
    #   10-19 txns: provisional (83% stability to N=30)
    #   20+ txns but <14-day spread: provisional (temporal features unreliable)
    #   20+ txns and 14+ day spread: full unlock (90%+ stability)
    dates = df['date'].sort_values()
    day_spread = (dates.iloc[-1] - dates.iloc[0]).days
    provisional = n_txn < PROVISIONAL_TXNS or day_spread < FULL_UNLOCK_DAYS
    low_confidence = provisional  # backward compat

    return {
        'mean_spend': round(mean_spend, 4),
        'std_spend': round(std_spend, 4),
        'spend_cv': round(spend_cv, 6),
        'txn_frequency': round(txn_frequency, 4),
        'weekend_ratio': round(weekend_ratio, 6),
        'late_night_ratio': round(late_night_ratio, 6),
        'pct_food': round(pct['food'], 6),
        'pct_travel': round(pct['travel'], 6),
        'pct_leisure': round(pct['leisure'], 6),
        'pct_health': round(pct['health'], 6),
        'merchant_diversity': round(merchant_diversity, 6),
        'large_txn_ratio': round(large_txn_ratio, 6),
        'monthly_spend_cv': round(monthly_spend_cv, 6),
        'txn_regularity': round(txn_regularity, 6),
        'spend_trend': round(spend_trend, 4),
        'low_confidence': low_confidence,
        'provisional': provisional,
    }


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
