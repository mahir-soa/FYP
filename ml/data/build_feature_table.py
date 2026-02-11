import pandas as pd
import numpy as np
import json

np.random.seed(42)

CATEGORIES = ['Food', 'Travel', 'Leisure', 'Education', 'Other']
MOODS = ['Happy', 'Sad', 'Stressed', 'Neutral', 'Excited']


PERSONA_SPEND_RATIO = {
    'IMPULSIVE_SPENDER': (0.85, 1.30),
    'CAUTIOUS_SAVER': (0.40, 0.65),
    'WEEKEND_SPLURGER': (0.70, 1.10),
    'SUBSCRIPTION_HOARDER': (0.65, 1.00),
    'BALANCED_BUDGETER': (0.75, 0.95),
}


def normalize_amounts(txns, budgets):
    txns = txns.copy()
    txns['date'] = pd.to_datetime(txns['date'])
    txns['month'] = txns['date'].dt.to_period('M').astype(str)

    budget_limits = {}
    for _, row in budgets.iterrows():
        limits = json.loads(row['category_limits'])
        budget_limits[(row['user_id'], row['month'])] = {
            'total': row['total_budget'],
            'categories': limits,
        }

    for (user_id, month), group in txns.groupby(['user_id', 'month']):
        info = budget_limits.get((user_id, month))
        if not info:
            continue

        persona = group['persona'].iloc[0]
        lo, hi = PERSONA_SPEND_RATIO.get(persona, (0.7, 1.0))
        target_total = info['total'] * np.random.uniform(lo, hi)

        for cat in CATEGORIES:
            cat_mask = group.index[group['category'] == cat]
            if len(cat_mask) == 0:
                continue

            cat_budget = info['categories'].get(cat, 0)
            cat_target = cat_budget * np.random.uniform(lo, hi)
            cat_current = group.loc[cat_mask, 'amount'].sum()

            if cat_current > 0:
                scale = cat_target / cat_current
                txns.loc[cat_mask, 'amount'] = (group.loc[cat_mask, 'amount'] * scale).round(2)

    txns['amount'] = txns['amount'].clip(lower=0.50)
    return txns


def load_data():
    raw_txns = pd.read_csv('ml/data/generated/synthetic_users.csv')
    budgets = pd.read_csv('ml/data/generated/budgets.csv')
    profiles = pd.read_csv('ml/data/generated/user_profiles.csv')
    subs = pd.read_csv('ml/data/generated/subscriptions.csv')
    incomes = pd.read_csv('ml/data/generated/incomes.csv')

    txns = normalize_amounts(raw_txns, budgets)
    txns['date'] = pd.to_datetime(txns['date'])
    txns['month'] = txns['date'].dt.to_period('M').astype(str)
    txns['dow'] = txns['date'].dt.dayofweek
    txns['is_weekend'] = txns['dow'] >= 5

    return txns, budgets, profiles, subs, incomes


def compute_spend_features(group):
    return {
        'total_spend': group['amount'].sum(),
        'txn_count': len(group),
        'avg_txn': group['amount'].mean(),
        'max_txn': group['amount'].max(),
        'std_txn': group['amount'].std() if len(group) > 1 else 0,
    }


def compute_category_proportions(group, total_spend):
    props = {}
    for cat in CATEGORIES:
        cat_sum = group[group['category'] == cat]['amount'].sum()
        props[f'pct_{cat.lower()}'] = round(cat_sum / max(total_spend, 0.01), 4)
    return props


def compute_weekend_ratio(group):
    weekend = group[group['is_weekend']]['amount'].sum()
    weekday = group[~group['is_weekend']]['amount'].sum()
    return round(weekend / max(weekday, 0.01), 4)


def compute_mood_features(group):
    features = {}
    for mood in MOODS:
        mood_txns = group[group['mood'] == mood]
        features[f'{mood.lower()}_spend_avg'] = round(mood_txns['amount'].mean(), 2) if len(mood_txns) > 0 else 0
        features[f'{mood.lower()}_txn_count'] = len(mood_txns)

    mood_totals = group.groupby('mood')['amount'].sum()
    features['dominant_mood'] = mood_totals.idxmax() if len(mood_totals) > 0 else 'Neutral'
    return features


def compute_budget_adherence(user_id, month, group, budgets_df):
    budget_row = budgets_df[(budgets_df['user_id'] == user_id) & (budgets_df['month'] == month)]
    if len(budget_row) == 0:
        return {f'adherence_{cat.lower()}': 0 for cat in CATEGORIES}, 0

    limits = json.loads(budget_row.iloc[0]['category_limits'])
    adherence = {}
    overspent_count = 0

    for cat in CATEGORIES:
        actual = group[group['category'] == cat]['amount'].sum()
        budget = limits.get(cat, 0)
        ratio = actual / max(budget, 0.01)
        adherence[f'adherence_{cat.lower()}'] = round(ratio, 4)
        if ratio > 1.0:
            overspent_count += 1

    adherence['overspent_any_category'] = 1 if overspent_count > 0 else 0
    for cat in CATEGORIES:
        actual = group[group['category'] == cat]['amount'].sum()
        budget = limits.get(cat, 0)
        adherence[f'overspent_{cat.lower()}'] = 1 if actual > budget else 0

    return adherence, overspent_count


def compute_subscription_features(user_id, subs_df):
    user_subs = subs_df[subs_df['user_id'] == user_id]
    total = len(user_subs)
    if total == 0:
        return {'sub_count': 0, 'sub_total_cost': 0, 'inactive_ratio': 0}

    user_subs = user_subs.copy()
    user_subs['last_used_date'] = pd.to_datetime(user_subs['last_used_date'])
    inactive = len(user_subs[user_subs['last_used_date'] < pd.Timestamp('2024-12-01')])

    return {
        'sub_count': total,
        'sub_total_cost': round(user_subs['cost'].sum(), 2),
        'inactive_ratio': round(inactive / total, 4),
    }


def compute_trend(user_txns):
    monthly_totals = user_txns.groupby('month')['amount'].sum().sort_index()
    if len(monthly_totals) < 2:
        return 0
    slope = np.polyfit(range(len(monthly_totals)), monthly_totals.values, 1)[0]
    return round(slope, 2)


def main():
    txns, budgets, profiles, subs, incomes = load_data()

    profile_map = profiles.set_index('user_id').to_dict('index')
    user_personas = txns.groupby('user_id')['persona'].first().to_dict()

    rows = []
    months = sorted(txns['month'].unique())

    for user_id in sorted(txns['user_id'].unique()):
        user_txns = txns[txns['user_id'] == user_id]
        trend = compute_trend(user_txns)
        sub_features = compute_subscription_features(user_id, subs)
        profile = profile_map.get(user_id, {})

        for month in months:
            group = user_txns[user_txns['month'] == month]
            if len(group) == 0:
                continue

            spend = compute_spend_features(group)
            cat_props = compute_category_proportions(group, spend['total_spend'])
            weekend_ratio = compute_weekend_ratio(group)
            mood_feats = compute_mood_features(group)
            adherence, _ = compute_budget_adherence(user_id, month, group, budgets)

            income_rows = incomes[(incomes['user_id'] == user_id)]
            monthly_income = income_rows['amount'].iloc[0] if len(income_rows) > 0 else 0

            row = {
                'user_id': user_id,
                'month': month,
                'persona': user_personas[user_id],
                'total_spend': round(spend['total_spend'], 2),
                'total_income': monthly_income,
                'txn_count': spend['txn_count'],
                'avg_txn': round(spend['avg_txn'], 2),
                'max_txn': round(spend['max_txn'], 2),
                'std_txn': round(spend['std_txn'], 2),
                **cat_props,
                'weekend_ratio': weekend_ratio,
                **mood_feats,
                **adherence,
                **sub_features,
                'spending_trend': trend,
                'debt_to_income_ratio': profile.get('debt_to_income_ratio', 0),
                'credit_score': profile.get('credit_score', 0),
                'savings_to_income_ratio': profile.get('savings_to_income_ratio', 0),
            }
            rows.append(row)

    feature_df = pd.DataFrame(rows)
    feature_df.to_csv('ml/data/generated/feature_table.csv', index=False)

    print(f"Feature table: {feature_df.shape[0]} rows x {feature_df.shape[1]} columns")
    print(f"Users: {feature_df['user_id'].nunique()}")
    print(f"Months: {sorted(feature_df['month'].unique())}")
    print(f"\nOverspend rate: {feature_df['overspent_any_category'].mean():.1%}")
    print(f"\nColumns:\n{list(feature_df.columns)}")


if __name__ == '__main__':
    main()
