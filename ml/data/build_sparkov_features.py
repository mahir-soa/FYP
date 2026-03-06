"""
Build user-level behavioural features from Sparkov (fraudTrain.csv + fraudTest.csv).
Output: ml/data/generated/sparkov_user_features.csv — one row per user, 15 features.
"""

import pandas as pd
import numpy as np
import os

# Sparkov category -> app category mapping
CATEGORY_MAP = {
    'food_dining':    'food',
    'grocery_net':    'food',
    'grocery_pos':    'food',
    'gas_transport':  'travel',
    'travel':         'travel',
    'entertainment':  'leisure',
    'shopping_net':   'leisure',
    'shopping_pos':   'leisure',
    'health_fitness': 'health',
    'home':           'other',
    'kids_pets':      'other',
    'misc_net':       'other',
    'misc_pos':       'other',
    'personal_care':  'other',
}

APP_CATEGORIES = ['food', 'travel', 'leisure', 'health', 'other']

MIN_TRANSACTIONS = 20
MIN_ACTIVE_MONTHS = 2


def load_sparkov():
    base = os.path.dirname(__file__)
    train = pd.read_csv(os.path.join(base, 'fraudTrain.csv'))
    test = pd.read_csv(os.path.join(base, 'fraudTest.csv'))

    df = pd.concat([train, test], ignore_index=True)
    print(f"Loaded {len(df):,} transactions ({len(train):,} train + {len(test):,} test)")

    fraud_count = df['is_fraud'].sum()
    df = df[df['is_fraud'] == 0].copy()
    print(f"Removed {fraud_count:,} fraudulent transactions -> {len(df):,} remaining")

    return df


def prepare_transactions(df):
    df['datetime'] = pd.to_datetime(df['trans_date_trans_time'])
    df['hour'] = df['datetime'].dt.hour
    df['dow'] = df['datetime'].dt.dayofweek
    df['month'] = df['datetime'].dt.to_period('M')
    df['date'] = df['datetime'].dt.date
    df['is_weekend'] = df['dow'] >= 5
    df['is_late_night'] = ((df['hour'] >= 22) | (df['hour'] < 5))

    df['app_category'] = df['category'].map(CATEGORY_MAP)
    unmapped = df['app_category'].isna().sum()
    if unmapped > 0:
        print(f"  Warning: {unmapped} transactions with unmapped category -> assigned 'other'")
        df['app_category'] = df['app_category'].fillna('other')

    return df


def compute_user_features(df):
    users = []

    grouped = df.groupby('cc_num')
    total_users = len(grouped)
    skipped_txn = 0
    skipped_months = 0

    for cc_num, g in grouped:
        n_txn = len(g)
        active_months = g['month'].nunique()

        # Filter: exclude users with < 20 transactions OR < 2 active months
        if n_txn < MIN_TRANSACTIONS:
            skipped_txn += 1
            continue
        if active_months < MIN_ACTIVE_MONTHS:
            skipped_months += 1
            continue

        total_spend = g['amt'].sum()
        if total_spend <= 0:
            continue

        # Spend level & volatility
        mean_spend = g['amt'].mean()
        std_spend = g['amt'].std() if n_txn > 1 else 0.0
        spend_cv = std_spend / mean_spend if mean_spend > 0 else 0.0

        # Transaction frequency
        txn_frequency = n_txn / active_months

        # Timing features
        weekend_spend = g[g['is_weekend']]['amt'].sum()
        weekend_ratio = weekend_spend / total_spend

        late_night_spend = g[g['is_late_night']]['amt'].sum()
        late_night_ratio = late_night_spend / total_spend

        # Category percentages (4 of 5, pct_other dropped)
        cat_spend = g.groupby('app_category')['amt'].sum()
        pct = {}
        for cat in APP_CATEGORIES:
            pct[cat] = cat_spend.get(cat, 0) / total_spend

        # Merchant diversity
        unique_merchants = g['merchant'].nunique()
        merchant_diversity = unique_merchants / n_txn

        # Large transaction ratio
        p75 = g['amt'].quantile(0.75)
        large_txn_spend = g[g['amt'] > p75]['amt'].sum()
        large_txn_ratio = large_txn_spend / total_spend

        # Monthly consistency (CV of monthly totals)
        monthly_totals = g.groupby('month')['amt'].sum().sort_index()
        if len(monthly_totals) > 1:
            monthly_mean = monthly_totals.mean()
            monthly_std = monthly_totals.std()
            monthly_spend_cv = monthly_std / monthly_mean if monthly_mean > 0 else 0.0
        else:
            monthly_spend_cv = 0.0

        # Transaction regularity
        dates_sorted = g['datetime'].sort_values()
        if len(dates_sorted) > 1:
            gaps = dates_sorted.diff().dropna().dt.total_seconds() / 86400  # days
            gap_std = gaps.std()
            txn_regularity = 1.0 / (1.0 + gap_std)
        else:
            txn_regularity = 0.0

        # Spend trend: linear slope of monthly totals
        if len(monthly_totals) > 1:
            x = np.arange(len(monthly_totals))
            slope = np.polyfit(x, monthly_totals.values, 1)[0]
        else:
            slope = 0.0

        users.append({
            'cc_num': cc_num,
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
            'spend_trend': round(slope, 4),
        })

    print(f"\nUser filtering:")
    print(f"  Total unique users: {total_users:,}")
    print(f"  Skipped (< {MIN_TRANSACTIONS} transactions): {skipped_txn:,}")
    print(f"  Skipped (< {MIN_ACTIVE_MONTHS} active months): {skipped_months:,}")
    print(f"  Retained: {len(users):,}")

    return pd.DataFrame(users)


def print_summary(features_df):
    feature_cols = [c for c in features_df.columns if c != 'cc_num']

    print(f"\n{'='*80}")
    print(f"SPARKOV USER FEATURES SUMMARY")
    print(f"{'='*80}")
    print(f"Users: {len(features_df):,}")
    print(f"Features: {len(feature_cols)}")

    print(f"\n{'Feature':<25} {'Min':>12} {'Max':>12} {'Mean':>12} {'Std':>12} {'CV':>8}")
    print("-" * 83)
    for col in feature_cols:
        vals = features_df[col]
        cv = vals.std() / vals.mean() if vals.mean() != 0 else 0
        print(f"{col:<25} {vals.min():>12.4f} {vals.max():>12.4f} "
              f"{vals.mean():>12.4f} {vals.std():>12.4f} {cv:>8.3f}")


def main():
    df = load_sparkov()
    df = prepare_transactions(df)

    print(f"\nSparkov categories found: {sorted(df['category'].unique())}")
    print(f"Mapped app categories: {sorted(df['app_category'].unique())}")

    features_df = compute_user_features(df)

    print_summary(features_df)

    out_dir = os.path.join(os.path.dirname(__file__), 'generated')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'sparkov_user_features.csv')
    features_df.to_csv(out_path, index=False)
    print(f"\nSaved to {out_path}")


if __name__ == '__main__':
    main()
