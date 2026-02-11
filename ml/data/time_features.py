import pandas as pd
import numpy as np
from datetime import timedelta
import random

np.random.seed(42)
random.seed(42)


def load_real_behaviour():
    df = pd.read_csv('ml/data/11 march 2025.csv')
    df['date'] = pd.to_datetime(df['date'])
    df['dow'] = df['date'].dt.dayofweek  # 0=Mon, 6=Sun
    df['is_weekend'] = df['dow'] >= 5
    df['hour'] = df['date'].dt.hour
    df['day_of_month'] = df['date'].dt.day
    df['month'] = df['date'].dt.to_period('M')
    return df


def extract_behaviour_signals(df):
    weekend_ratio = df[df['is_weekend']]['amount'].mean() / max(df[~df['is_weekend']]['amount'].mean(), 0.01)

    monthly = df.groupby('month')['amount'].sum().sort_index()
    if len(monthly) > 1:
        trend_slope = np.polyfit(range(len(monthly)), monthly.values, 1)[0]
    else:
        trend_slope = 0.0

    daily_amounts = df.groupby(df['date'].dt.date)['amount'].sum()
    volatility = daily_amounts.std() / max(daily_amounts.mean(), 0.01)

    dow_pattern = df.groupby('dow')['amount'].mean().to_dict()

    dom_pattern = df.groupby('day_of_month')['amount'].mean()
    early_month = dom_pattern[dom_pattern.index <= 10].mean()
    late_month = dom_pattern[dom_pattern.index > 20].mean()
    month_phase_ratio = early_month / max(late_month, 0.01)

    coffee_like = df[df['category'].isin(['Coffe', 'Restuarant'])]
    daily_coffee = coffee_like.groupby(coffee_like['date'].dt.date).size()
    habit_frequency = daily_coffee.mean() if len(daily_coffee) > 0 else 0

    return {
        'weekend_ratio': weekend_ratio,
        'trend_slope': trend_slope,
        'volatility': volatility,
        'dow_pattern': dow_pattern,
        'month_phase_ratio': month_phase_ratio,
        'habit_frequency': habit_frequency,
    }


def apply_time_enrichment(users_df, signals):
    users_df = users_df.copy()
    users_df['date'] = pd.to_datetime(users_df['date'])
    users_df['dow'] = users_df['date'].dt.dayofweek
    users_df['day_of_month'] = users_df['date'].dt.day

    dow_avg = signals['dow_pattern']
    overall_dow_mean = np.mean(list(dow_avg.values()))
    dow_factors = {d: dow_avg.get(d, overall_dow_mean) / max(overall_dow_mean, 0.01) for d in range(7)}

    enriched_rows = []

    for user_id in users_df['user_id'].unique():
        user_mask = users_df['user_id'] == user_id
        user_data = users_df[user_mask].copy()
        persona = user_data['persona'].iloc[0]

        noise_scale = {
            'IMPULSIVE_SPENDER': 0.3,
            'CAUTIOUS_SAVER': 0.05,
            'WEEKEND_SPLURGER': 0.2,
            'SUBSCRIPTION_HOARDER': 0.1,
            'BALANCED_BUDGETER': 0.08,
        }.get(persona, 0.1)

        for idx, row in user_data.iterrows():
            amount = row['amount']

            dow_factor = dow_factors.get(row['dow'], 1.0)
            amount *= (1 + (dow_factor - 1) * 0.5)

            if row['day_of_month'] <= 7:
                amount *= np.random.uniform(1.05, 1.15)
            elif row['day_of_month'] >= 25:
                amount *= np.random.uniform(0.85, 0.95)

            noise = np.random.normal(0, noise_scale)
            amount *= (1 + noise)

            amount = max(round(amount, 2), 0.50)

            row_dict = row.to_dict()
            row_dict['amount'] = amount
            enriched_rows.append(row_dict)

    result = pd.DataFrame(enriched_rows)
    result['date'] = result['date'].dt.strftime('%Y-%m-%d')
    result = result.drop(columns=['dow', 'day_of_month'])
    return result


def main():
    real_data = load_real_behaviour()
    signals = extract_behaviour_signals(real_data)

    print("Extracted behaviour signals from 11 march dataset:")
    print(f"  Weekend/weekday ratio: {signals['weekend_ratio']:.3f}")
    print(f"  Monthly trend slope: {signals['trend_slope']:.2f}")
    print(f"  Daily spending volatility: {signals['volatility']:.3f}")
    print(f"  Early/late month ratio: {signals['month_phase_ratio']:.3f}")
    print(f"  Daily habit frequency: {signals['habit_frequency']:.2f}")

    users_df = pd.read_csv('ml/data/generated/synthetic_users.csv')
    print(f"\nLoaded {len(users_df)} synthetic transactions")

    enriched = apply_time_enrichment(users_df, signals)
    enriched.to_csv('ml/data/generated/synthetic_users.csv', index=False)
    print(f"Enriched and saved {len(enriched)} transactions")


if __name__ == '__main__':
    main()
