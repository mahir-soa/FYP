"""
Self-consistency test for persona classification at low transaction counts.

For each Sparkov user, at each transaction count N:
  - Take 10 different random subsamples of N transactions
  - Classify each subsample with the current model
  - Check if all 10 agree with each other

No ground truth comparison. The question is:
"Do 10 random picks of N transactions give the same persona?"
"""

import os
import numpy as np
import pandas as pd
import joblib

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

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

SAMPLE_COUNTS = [10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200]
N_DRAWS = 10
MIN_USER_TXNS = 200  # only test users with enough transactions to subsample from


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_sparkov():
    base = os.path.dirname(os.path.abspath(__file__))
    train = pd.read_csv(os.path.join(base, 'fraudTrain.csv'))
    test = pd.read_csv(os.path.join(base, 'fraudTest.csv'))
    df = pd.concat([train, test], ignore_index=True)
    print(f"Loaded {len(df):,} transactions")
    df = df[df['is_fraud'] == 0].copy()
    print(f"After removing fraud: {len(df):,}")
    return df


def prepare_transactions(df):
    df['datetime'] = pd.to_datetime(df['trans_date_trans_time'])
    df['hour'] = df['datetime'].dt.hour
    df['dow'] = df['datetime'].dt.dayofweek
    df['month'] = df['datetime'].dt.to_period('M')
    df['is_weekend'] = df['dow'] >= 5
    df['is_late_night'] = ((df['hour'] >= 22) | (df['hour'] < 5))
    df['app_category'] = df['category'].map(CATEGORY_MAP).fillna('other')
    return df


# ---------------------------------------------------------------------------
# Feature computation
# ---------------------------------------------------------------------------

def compute_features(g):
    n_txn = len(g)
    if n_txn < 2:
        return None

    active_months = g['month'].nunique()
    total_spend = g['amt'].sum()
    if total_spend <= 0:
        return None

    mean_spend = g['amt'].mean()
    std_spend = g['amt'].std()
    spend_cv = std_spend / mean_spend if mean_spend > 0 else 0.0
    txn_frequency = n_txn / max(active_months, 1)

    weekend_spend = g[g['is_weekend']]['amt'].sum()
    weekend_ratio = weekend_spend / total_spend

    late_night_spend = g[g['is_late_night']]['amt'].sum()
    late_night_ratio = late_night_spend / total_spend

    cat_spend = g.groupby('app_category')['amt'].sum()
    pct = {cat: cat_spend.get(cat, 0) / total_spend for cat in APP_CATEGORIES}

    unique_merchants = g['merchant'].nunique()
    merchant_diversity = unique_merchants / n_txn

    p75 = g['amt'].quantile(0.75)
    large_txn_spend = g[g['amt'] > p75]['amt'].sum()
    large_txn_ratio = large_txn_spend / total_spend

    monthly_totals = g.groupby('month')['amt'].sum().sort_index()
    if len(monthly_totals) > 1:
        monthly_spend_cv = monthly_totals.std() / monthly_totals.mean() if monthly_totals.mean() > 0 else 0.0
    else:
        monthly_spend_cv = 0.0

    dates_sorted = g['datetime'].sort_values()
    if len(dates_sorted) > 1:
        gaps = dates_sorted.diff().dropna().dt.total_seconds() / 86400
        txn_regularity = 1.0 / (1.0 + gaps.std())
    else:
        txn_regularity = 0.0

    if len(monthly_totals) > 1:
        spend_trend = np.polyfit(np.arange(len(monthly_totals)), monthly_totals.values, 1)[0]
    else:
        spend_trend = 0.0

    return {
        'mean_spend': mean_spend, 'std_spend': std_spend, 'spend_cv': spend_cv,
        'txn_frequency': txn_frequency, 'weekend_ratio': weekend_ratio,
        'late_night_ratio': late_night_ratio,
        'pct_food': pct['food'], 'pct_travel': pct['travel'],
        'pct_leisure': pct['leisure'], 'pct_health': pct['health'],
        'merchant_diversity': merchant_diversity, 'large_txn_ratio': large_txn_ratio,
        'monthly_spend_cv': monthly_spend_cv, 'txn_regularity': txn_regularity,
        'spend_trend': spend_trend,
    }


# ---------------------------------------------------------------------------
# Persona prediction (matches current pipeline)
# ---------------------------------------------------------------------------

def predict_persona(features_dict, model_data):
    active_features = model_data.get('active_features', model_data['features'])
    log_features = model_data.get('log_features', [])
    scaler = model_data['scaler']
    pca = model_data.get('pca')
    model = model_data['model']
    cluster_to_persona = model_data['cluster_to_persona']

    X = np.array([[features_dict.get(f, 0) for f in active_features]])

    for i, f in enumerate(active_features):
        if f in log_features:
            X[0, i] = np.log1p(X[0, i])
        elif f == 'spend_trend' and 'spend_trend' not in log_features:
            X[0, i] = np.sign(X[0, i]) * np.log1p(np.abs(X[0, i]))

    X_scaled = scaler.transform(X)
    if pca is not None:
        X_scaled = pca.transform(X_scaled)

    cluster_id = model.predict(X_scaled)[0]
    return cluster_to_persona[int(cluster_id)]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              '..', 'trained_models', 'persona_kmeans.pkl')
    model_data = joblib.load(model_path)
    print(f"Model: k={model_data['selected_k']}, "
          f"personas={list(model_data['cluster_to_persona'].values())}")

    df = load_sparkov()
    df = prepare_transactions(df)

    # Filter to users with enough transactions to subsample from
    user_counts = df.groupby('cc_num').size()
    eligible = user_counts[user_counts >= MIN_USER_TXNS].index.tolist()
    print(f"Users with >= {MIN_USER_TXNS} transactions: {len(eligible)}")

    rng = np.random.RandomState(42)

    # For each N, for each user, draw 10 subsamples and classify
    # agreement = fraction of users where all 10 draws give the same persona
    # majority_agreement = fraction of users where >= 8/10 draws agree
    print(f"\nDrawing {N_DRAWS} random subsamples per user per N...")
    print(f"Testing N = {SAMPLE_COUNTS}\n")

    print(f"{'N':>5}  {'Users':>6}  {'All-10 agree':>13}  {'>=8/10 agree':>13}  "
          f"{'>=6/10 agree':>13}  {'Mean majority%':>15}")
    print("-" * 75)

    for n in SAMPLE_COUNTS:
        users_tested = 0
        all_agree = 0
        gte8_agree = 0
        gte6_agree = 0
        majority_pcts = []

        for cc_num in eligible:
            user_txns = df[df['cc_num'] == cc_num]
            if len(user_txns) < n:
                continue

            personas = []
            for draw in range(N_DRAWS):
                sampled = user_txns.sample(n=n, random_state=rng)
                features = compute_features(sampled)
                if features is None:
                    continue
                persona = predict_persona(features, model_data)
                personas.append(persona)

            if len(personas) < N_DRAWS:
                continue

            users_tested += 1
            unique = set(personas)
            most_common_count = max(personas.count(p) for p in unique)
            majority_pct = most_common_count / N_DRAWS

            majority_pcts.append(majority_pct)

            if len(unique) == 1:
                all_agree += 1
            if most_common_count >= 8:
                gte8_agree += 1
            if most_common_count >= 6:
                gte6_agree += 1

        if users_tested == 0:
            print(f"{n:>5}  {'N/A':>6}")
            continue

        print(f"{n:>5}  {users_tested:>6}  "
              f"{all_agree:>6} ({100*all_agree/users_tested:>5.1f}%)  "
              f"{gte8_agree:>6} ({100*gte8_agree/users_tested:>5.1f}%)  "
              f"{gte6_agree:>6} ({100*gte6_agree/users_tested:>5.1f}%)  "
              f"{100*np.mean(majority_pcts):>13.1f}%")

    # Per-persona breakdown at key thresholds
    print(f"\n\nPER-PERSONA SELF-CONSISTENCY (all-10-agree rate)")
    print("=" * 70)

    detail_ns = [n for n in [20, 30, 50, 100] if n in SAMPLE_COUNTS]

    for n in detail_ns:
        print(f"\nN={n}:")
        persona_stats = {}

        for cc_num in eligible:
            user_txns = df[df['cc_num'] == cc_num]
            if len(user_txns) < n:
                continue

            personas = []
            for draw in range(N_DRAWS):
                sampled = user_txns.sample(n=n, random_state=rng.randint(0, 100000))
                features = compute_features(sampled)
                if features is None:
                    continue
                persona = predict_persona(features, model_data)
                personas.append(persona)

            if len(personas) < N_DRAWS:
                continue

            most_common = max(set(personas), key=personas.count)
            all_same = len(set(personas)) == 1

            if most_common not in persona_stats:
                persona_stats[most_common] = {'total': 0, 'all_agree': 0}
            persona_stats[most_common]['total'] += 1
            if all_same:
                persona_stats[most_common]['all_agree'] += 1

        for persona in sorted(persona_stats.keys()):
            s = persona_stats[persona]
            pct = 100 * s['all_agree'] / s['total'] if s['total'] > 0 else 0
            print(f"  {persona:<22} {s['all_agree']:>4}/{s['total']:<4} ({pct:.1f}%)")


if __name__ == '__main__':
    main()
