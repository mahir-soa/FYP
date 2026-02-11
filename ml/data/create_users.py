import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

np.random.seed(42)
random.seed(42)

CATEGORY_MAP = {
    'Food & Drink': 'Food',
    'Travel': 'Travel',
    'Entertainment': 'Leisure',
    'Shopping': 'Leisure',
    'Health & Fitness': 'Education',
    'Utilities': 'Other',
    'Rent': 'Other',
    'Other': 'Other',
    'Investment': None,  # skip income-type categories
}

PERSONAS = {
    'IMPULSIVE_SPENDER': {
        'users': list(range(1, 11)),
        'mood_weights': {'Stressed': 0.40, 'Happy': 0.15, 'Sad': 0.15, 'Neutral': 0.20, 'Excited': 0.10},
        'amount_multiplier': (0.5, 3.0),  # high variance
        'spike_chance': 0.15,  # 15% chance of a random large purchase
        'spike_multiplier': (2.5, 5.0),
    },
    'CAUTIOUS_SAVER': {
        'users': list(range(11, 21)),
        'mood_weights': {'Neutral': 0.50, 'Happy': 0.25, 'Sad': 0.10, 'Excited': 0.10, 'Stressed': 0.05},
        'amount_multiplier': (0.3, 0.7),  # consistently low
        'spike_chance': 0.0,
        'spike_multiplier': (1.0, 1.0),
    },
    'WEEKEND_SPLURGER': {
        'users': list(range(21, 31)),
        'mood_weights': {'Excited': 0.35, 'Happy': 0.25, 'Neutral': 0.20, 'Stressed': 0.10, 'Sad': 0.10},
        'amount_multiplier': (0.6, 1.2),
        'weekend_boost': (1.5, 2.0),
        'spike_chance': 0.0,
        'spike_multiplier': (1.0, 1.0),
    },
    'SUBSCRIPTION_HOARDER': {
        'users': list(range(31, 41)),
        'mood_weights': {'Neutral': 0.40, 'Happy': 0.20, 'Stressed': 0.20, 'Sad': 0.10, 'Excited': 0.10},
        'amount_multiplier': (0.6, 1.3),
        'spike_chance': 0.0,
        'spike_multiplier': (1.0, 1.0),
    },
    'BALANCED_BUDGETER': {
        'users': list(range(41, 51)),
        'mood_weights': {'Happy': 0.30, 'Neutral': 0.30, 'Excited': 0.15, 'Stressed': 0.15, 'Sad': 0.10},
        'amount_multiplier': (0.7, 1.1),  # tight range, close to average
        'spike_chance': 0.0,
        'spike_multiplier': (1.0, 1.0),
    },
}

MOODS = ['Happy', 'Sad', 'Stressed', 'Neutral', 'Excited']

START_DATE = datetime(2024, 8, 1)
END_DATE = datetime(2025, 1, 31)
DATE_RANGE_DAYS = (END_DATE - START_DATE).days


def load_expense_pool():
    df = pd.read_csv('ml/data/Personal_Finance_Dataset.csv')
    df = df[df['Type'] == 'Expense'].copy()
    df['mapped_category'] = df['Category'].map(CATEGORY_MAP)
    df = df.dropna(subset=['mapped_category'])
    return df


def random_date_in_range():
    return START_DATE + timedelta(days=random.randint(0, DATE_RANGE_DAYS))


def assign_mood(persona_config):
    weights = persona_config['mood_weights']
    return np.random.choice(MOODS, p=[weights[m] for m in MOODS])


def adjust_amount(base_amount, persona_key, persona_config, is_weekend):
    lo, hi = persona_config['amount_multiplier']
    multiplier = np.random.uniform(lo, hi)

    if persona_config.get('spike_chance', 0) > 0 and random.random() < persona_config['spike_chance']:
        s_lo, s_hi = persona_config['spike_multiplier']
        multiplier *= np.random.uniform(s_lo, s_hi)

    if is_weekend and 'weekend_boost' in persona_config:
        w_lo, w_hi = persona_config['weekend_boost']
        multiplier *= np.random.uniform(w_lo, w_hi)

    return round(base_amount * multiplier, 2)


def generate_user_transactions(user_id, persona_key, persona_config, expense_pool):
    num_transactions = random.randint(100, 300)
    sampled = expense_pool.sample(n=num_transactions, replace=True)

    rows = []
    categories = ['Food', 'Travel', 'Leisure', 'Education', 'Other']

    for _, txn in sampled.iterrows():
        date = random_date_in_range()
        is_weekend = date.weekday() >= 5

        if persona_key == 'BALANCED_BUDGETER':
            category = random.choice(categories)
        else:
            category = txn['mapped_category']

        amount = adjust_amount(txn['Amount'], persona_key, persona_config, is_weekend)
        mood = assign_mood(persona_config)

        rows.append({
            'user_id': user_id,
            'date': date.strftime('%Y-%m-%d'),
            'description': txn['Transaction Description'],
            'amount': amount,
            'category': category,
            'mood': mood,
            'persona': persona_key,
        })

    return pd.DataFrame(rows)


def main():
    expense_pool = load_expense_pool()
    print(f"Expense pool: {len(expense_pool)} transactions")

    all_users = []

    for persona_key, config in PERSONAS.items():
        for user_id in config['users']:
            user_df = generate_user_transactions(
                user_id=user_id,
                persona_key=persona_key,
                persona_config=config,
                expense_pool=expense_pool,
            )
            all_users.append(user_df)
            print(f"  user_{user_id} ({persona_key}): {len(user_df)} transactions")

    result = pd.concat(all_users, ignore_index=True)
    result = result.sort_values(['user_id', 'date']).reset_index(drop=True)

    result.to_csv('ml/data/generated/synthetic_users.csv', index=False)
    print(f"\nTotal: {len(result)} transactions across 50 users")
    print(f"Saved to ml/data/generated/synthetic_users.csv")


if __name__ == '__main__':
    main()
