import pandas as pd
import numpy as np
import joblib
import os
import json
from collections import Counter

np.random.seed(42)

CATEGORY_MAP = {
    'food_dining': 'food', 'grocery_net': 'food', 'grocery_pos': 'food',
    'gas_transport': 'travel', 'travel': 'travel',
    'entertainment': 'leisure', 'shopping_net': 'leisure', 'shopping_pos': 'leisure',
    'health_fitness': 'health',
    'home': 'other', 'kids_pets': 'other', 'misc_net': 'other',
    'misc_pos': 'other', 'personal_care': 'other',
}
APP_CATEGORIES = ['food', 'travel', 'leisure', 'health', 'other']

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'trained_models', 'persona_kmeans.pkl')
data = joblib.load(MODEL_PATH)
model = data['model']
scaler = data['scaler']
pca = data.get('pca')
cluster_map = data['cluster_to_persona']
active_features = data.get('active_features', [])
log_features = data.get('log_features', [])

print(f"Model loaded: {len(active_features)} features, PCA={pca.n_components_ if pca else 'None'}")
print(f"Cluster map: {cluster_map}\n")


def extract_features(g):
    n_txn = len(g)
    if n_txn < 2:
        return None

    active_months = g['month'].nunique()
    total_spend = g['amt'].sum()
    if total_spend <= 0:
        return None

    mean_spend = g['amt'].mean()
    std_spend = g['amt'].std() if n_txn > 1 else 0.0
    spend_cv = std_spend / mean_spend if mean_spend > 0 else 0.0
    txn_frequency = n_txn / max(active_months, 1)

    weekend_spend = g[g['is_weekend']]['amt'].sum()
    weekend_ratio = weekend_spend / total_spend
    late_night_spend = g[g['is_late_night']]['amt'].sum()
    late_night_ratio = late_night_spend / total_spend

    cat_spend = g.groupby('app_category')['amt'].sum()
    pct = {cat: cat_spend.get(cat, 0) / total_spend for cat in APP_CATEGORIES}

    merchant_diversity = g['merchant'].nunique() / n_txn
    p75 = g['amt'].quantile(0.75)
    large_txn_ratio = g[g['amt'] > p75]['amt'].sum() / total_spend

    monthly_totals = g.groupby('month')['amt'].sum().sort_index()
    if len(monthly_totals) > 1:
        monthly_spend_cv = monthly_totals.std() / monthly_totals.mean() if monthly_totals.mean() > 0 else 0
    else:
        monthly_spend_cv = 0

    dates_sorted = g['datetime'].sort_values()
    if len(dates_sorted) > 1:
        gaps = dates_sorted.diff().dropna().dt.total_seconds() / 86400
        txn_regularity = 1.0 / (1.0 + gaps.std())
    else:
        txn_regularity = 0

    if len(monthly_totals) > 1:
        slope = np.polyfit(np.arange(len(monthly_totals)), monthly_totals.values, 1)[0]
    else:
        slope = 0

    return {
        'mean_spend': mean_spend, 'std_spend': std_spend, 'spend_cv': spend_cv,
        'txn_frequency': txn_frequency, 'weekend_ratio': weekend_ratio,
        'late_night_ratio': late_night_ratio, 'pct_food': pct['food'],
        'pct_travel': pct['travel'], 'pct_leisure': pct['leisure'],
        'pct_health': pct['health'], 'merchant_diversity': merchant_diversity,
        'large_txn_ratio': large_txn_ratio, 'monthly_spend_cv': monthly_spend_cv,
        'txn_regularity': txn_regularity, 'spend_trend': slope,
    }


def predict_persona(features_dict):
    X_df = pd.DataFrame([{f: features_dict.get(f, 0) for f in active_features}])
    for col in log_features:
        if col in X_df.columns:
            if col == 'spend_trend':
                X_df[col] = np.sign(X_df[col]) * np.log1p(np.abs(X_df[col]))
            else:
                X_df[col] = np.log1p(X_df[col])
    X_scaled = scaler.transform(X_df.values)
    if pca is not None:
        X_scaled = pca.transform(X_scaled)
    cluster = model.predict(X_scaled)[0]
    return cluster_map.get(int(cluster), 'BALANCED_SPENDER')


print("Loading Sparkov transactions (train + test)...")
base_dir = os.path.dirname(__file__)
raw = pd.concat([
    pd.read_csv(os.path.join(base_dir, 'fraudTrain.csv')),
    pd.read_csv(os.path.join(base_dir, 'fraudTest.csv')),
], ignore_index=True)
raw = raw[raw['is_fraud'] == 0].copy()
raw['datetime'] = pd.to_datetime(raw['trans_date_trans_time'])
raw['hour'] = raw['datetime'].dt.hour
raw['dow'] = raw['datetime'].dt.dayofweek
raw['month'] = raw['datetime'].dt.to_period('M')
raw['is_weekend'] = raw['dow'] >= 5
raw['is_late_night'] = ((raw['hour'] >= 22) | (raw['hour'] < 5))
raw['app_category'] = raw['category'].map(CATEGORY_MAP).fillna('other')
print(f"  {len(raw)} transactions, {raw['cc_num'].nunique()} users\n")

user_groups = {uid: g for uid, g in raw.groupby('cc_num') if len(g) >= 50}
print(f"Users with 50+ transactions: {len(user_groups)}\n")

LEVELS = [5, 8, 10, 15, 20, 25, 30, 35, 40, 50]
N_SAMPLES = 10

print(f"Running self-consistency test: {len(user_groups)} users x {len(LEVELS)} levels x {N_SAMPLES} samples\n")

results = {}

for level in LEVELS:
    consistent_users = 0
    tested_users = 0
    majority_agreement = 0

    for uid, txns in user_groups.items():
        if len(txns) < level:
            continue

        tested_users += 1
        personas = []

        for i in range(N_SAMPLES):
            sampled = txns.sample(n=level, random_state=42 + i * 997 + level * 13)
            features = extract_features(sampled)
            if features is None:
                continue
            personas.append(predict_persona(features))

        if not personas:
            continue

        if len(set(personas)) == 1:
            consistent_users += 1

        most_common_count = Counter(personas).most_common(1)[0][1]
        if most_common_count / len(personas) >= 0.8:
            majority_agreement += 1

    consistency = consistent_users / tested_users if tested_users > 0 else 0
    majority = majority_agreement / tested_users if tested_users > 0 else 0

    results[level] = {
        'full_consistency': round(consistency, 4),
        'majority_consistency': round(majority, 4),
        'consistent_users': int(consistent_users),
        'majority_users': int(majority_agreement),
        'tested_users': int(tested_users),
    }

    print(f"  n={level:3d}  |  100% agree: {consistency:5.1%} ({consistent_users}/{tested_users})  |  >=80% agree: {majority:5.1%} ({majority_agreement}/{tested_users})")

print(f"\n{'=' * 80}")
print("SELF-CONSISTENCY: At N transactions, how often do different samples agree?")
print(f"{'=' * 80}")
print(f"{'Txns':>6} | {'All 10 agree':>13} | {'>=8/10 agree':>13} | {'Tested':>7}")
print("-" * 55)

recommended = None
for level in LEVELS:
    r = results[level]
    marker = ""
    if r['majority_consistency'] >= 0.70 and recommended is None:
        recommended = level
        marker = " <-- recommended"
    print(f"{level:>6} | {r['full_consistency']:>12.1%} | {r['majority_consistency']:>12.1%} | {r['tested_users']:>7}{marker}")

print("-" * 55)
print(f"\nRECOMMENDATION:")
if recommended:
    print(f"  At n={recommended}, >=70% of users get a consistent persona across random samples.")
    if recommended <= 30:
        print(f"  Current threshold of 30 is at or above the empirical minimum.")
    else:
        print(f"  Consider raising the full unlock threshold to {recommended}.")
else:
    print(f"  Consistency never reaches 70% at any tested level.")

output = {
    'experiment': 'persona_self_consistency_vs_transaction_count',
    'n_users': int(len(user_groups)),
    'n_samples': int(N_SAMPLES),
    'results': {str(k): v for k, v in results.items()},
    'recommended_minimum': int(recommended) if recommended else None,
}

output_path = os.path.join(os.path.dirname(__file__), 'minimum_txn_evaluation.json')
with open(output_path, 'w') as f:
    json.dump(output, f, indent=2)
print(f"\nSaved to {output_path}")
