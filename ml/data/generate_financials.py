import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

np.random.seed(42)
random.seed(42)

MONTHS = ['2024-08', '2024-09', '2024-10', '2024-11', '2024-12', '2025-01']

BILL_TEMPLATES = [
    {'name': 'Rent', 'category': 'RENT', 'range': (600, 1200)},
    {'name': 'Electricity', 'category': 'ELECTRICITY', 'range': (80, 150)},
    {'name': 'Water', 'category': 'WATER', 'range': (30, 60)},
    {'name': 'Phone', 'category': 'PHONE', 'range': (20, 50)},
    {'name': 'Insurance', 'category': 'INSURANCE', 'range': (30, 80)},
    {'name': 'Internet', 'category': 'INTERNET', 'range': (25, 55)},
]

SUBSCRIPTION_TEMPLATES = [
    {'name': 'Netflix', 'provider_key': 'netflix', 'cost': 10.99, 'category': 'STREAMING'},
    {'name': 'Spotify', 'provider_key': 'spotify', 'cost': 9.99, 'category': 'MUSIC'},
    {'name': 'Gym', 'provider_key': 'puregym', 'cost': 30.00, 'category': 'GYM'},
    {'name': 'Amazon Prime', 'provider_key': 'prime', 'cost': 8.99, 'category': 'STREAMING'},
    {'name': 'Disney+', 'provider_key': 'disney', 'cost': 7.99, 'category': 'STREAMING'},
    {'name': 'YouTube Premium', 'provider_key': 'youtube', 'cost': 12.99, 'category': 'STREAMING'},
    {'name': 'Apple Music', 'provider_key': 'apple', 'cost': 10.99, 'category': 'MUSIC'},
    {'name': 'HBO Max', 'provider_key': 'hbo', 'cost': 9.99, 'category': 'STREAMING'},
]

CATEGORIES = ['Food', 'Travel', 'Leisure', 'Education', 'Other']

BUDGET_RATIOS = {
    'IMPULSIVE_SPENDER': {'Food': 0.30, 'Travel': 0.15, 'Leisure': 0.30, 'Education': 0.10, 'Other': 0.15},
    'CAUTIOUS_SAVER': {'Food': 0.35, 'Travel': 0.10, 'Leisure': 0.15, 'Education': 0.20, 'Other': 0.20},
    'WEEKEND_SPLURGER': {'Food': 0.25, 'Travel': 0.20, 'Leisure': 0.30, 'Education': 0.10, 'Other': 0.15},
    'SUBSCRIPTION_HOARDER': {'Food': 0.30, 'Travel': 0.10, 'Leisure': 0.25, 'Education': 0.15, 'Other': 0.20},
    'BALANCED_BUDGETER': {'Food': 0.25, 'Travel': 0.15, 'Leisure': 0.20, 'Education': 0.20, 'Other': 0.20},
}


def generate_bills(user_id, profile):
    num_bills = random.randint(2, 4)
    selected = random.sample(BILL_TEMPLATES, num_bills)
    always_rent = next((b for b in BILL_TEMPLATES if b['name'] == 'Rent'), None)
    if always_rent and always_rent not in selected:
        selected[0] = always_rent

    rows = []
    for bill in selected:
        amount = round(random.uniform(*bill['range']), 2)
        due_day = random.randint(1, 28)
        rows.append({
            'user_id': user_id,
            'name': bill['name'],
            'amount': amount,
            'due_day': due_day,
            'frequency': 'MONTHLY',
            'category': bill['category'],
            'is_paid': False,
            'notes': '',
        })
    return rows


def generate_subscriptions(user_id, persona):
    if persona == 'SUBSCRIPTION_HOARDER':
        num_subs = random.randint(5, len(SUBSCRIPTION_TEMPLATES))
        num_inactive = random.randint(3, num_subs - 1)
    else:
        num_subs = random.randint(1, 3)
        num_inactive = 0

    selected = random.sample(SUBSCRIPTION_TEMPLATES, num_subs)
    rows = []
    for i, sub in enumerate(selected):
        is_inactive = i < num_inactive
        last_used_days_ago = random.randint(60, 180) if is_inactive else random.randint(0, 14)
        last_used = (datetime(2025, 1, 31) - timedelta(days=last_used_days_ago)).strftime('%Y-%m-%d')
        next_payment = (datetime(2025, 2, 1) + timedelta(days=random.randint(1, 28))).strftime('%Y-%m-%d')

        rows.append({
            'user_id': user_id,
            'name': sub['name'],
            'cost': sub['cost'],
            'billing_cycle': 'MONTHLY',
            'next_payment_date': next_payment,
            'last_used_date': last_used,
            'status': 'ACTIVE',
            'provider_key': sub['provider_key'],
            'category': sub['category'],
        })
    return rows


def generate_incomes(user_id, profile):
    rows = []
    for month in MONTHS:
        date = f"{month}-{random.choice([25, 28, 1]):02d}"
        rows.append({
            'user_id': user_id,
            'source': 'Salary',
            'amount': profile['monthly_income'],
            'date': date,
            'frequency': 'MONTHLY',
        })
    return rows


def generate_budgets(user_id, persona, profile, bills, subscriptions):
    total_bills = sum(b['amount'] for b in bills)
    total_subs = sum(s['cost'] for s in subscriptions)
    discretionary = profile['monthly_income'] - total_bills - total_subs
    discretionary = max(discretionary, profile['monthly_income'] * 0.3)

    ratios = BUDGET_RATIOS[persona]
    rows = []
    for month in MONTHS:
        category_limits = {cat: round(discretionary * ratio, 2) for cat, ratio in ratios.items()}
        rows.append({
            'user_id': user_id,
            'month': month,
            'total_budget': round(discretionary, 2),
            'category_limits': str(category_limits).replace("'", '"'),
            'safe_to_spend': round(discretionary * 0.9, 2),
        })
    return rows


def main():
    profiles = pd.read_csv('ml/data/generated/user_profiles.csv')
    users = pd.read_csv('ml/data/generated/synthetic_users.csv')
    user_personas = users.groupby('user_id')['persona'].first().to_dict()

    all_bills = []
    all_subs = []
    all_incomes = []
    all_budgets = []

    for _, profile in profiles.iterrows():
        uid = profile['user_id']
        persona = user_personas[uid]

        bills = generate_bills(uid, profile)
        subs = generate_subscriptions(uid, persona)
        incomes = generate_incomes(uid, profile)
        budgets = generate_budgets(uid, persona, profile, bills, subs)

        all_bills.extend(bills)
        all_subs.extend(subs)
        all_incomes.extend(incomes)
        all_budgets.extend(budgets)

    pd.DataFrame(all_bills).to_csv('ml/data/generated/bills.csv', index=False)
    pd.DataFrame(all_subs).to_csv('ml/data/generated/subscriptions.csv', index=False)
    pd.DataFrame(all_incomes).to_csv('ml/data/generated/incomes.csv', index=False)
    pd.DataFrame(all_budgets).to_csv('ml/data/generated/budgets.csv', index=False)

    print(f"Bills: {len(all_bills)} records")
    print(f"Subscriptions: {len(all_subs)} records")
    print(f"Incomes: {len(all_incomes)} records")
    print(f"Budgets: {len(all_budgets)} records")

    sub_df = pd.DataFrame(all_subs)
    hoarders = sub_df[sub_df['user_id'].isin([uid for uid, p in user_personas.items() if p == 'SUBSCRIPTION_HOARDER'])]
    print(f"\nSubscription Hoarder stats: avg {hoarders.groupby('user_id').size().mean():.1f} subs per user")


if __name__ == '__main__':
    main()
