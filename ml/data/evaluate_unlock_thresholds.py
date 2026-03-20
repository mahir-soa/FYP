import os
import sys
import numpy as np
import pandas as pd
import joblib

# ---------------------------------------------------------------------------
# Constants (mirrored from build_sparkov_features.py)
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

THRESHOLDS = [5, 10, 15, 20, 25, 30]

# ---------------------------------------------------------------------------
# Data loading & preparation
# ---------------------------------------------------------------------------

def load_sparkov():
    base = os.path.dirname(os.path.abspath(__file__))
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
        df['app_category'] = df['app_category'].fillna('other')

    return df


# ---------------------------------------------------------------------------
# Feature computation (from a subset of transactions)
# ---------------------------------------------------------------------------

def compute_features_from_txns(g):
    n_txn = len(g)
    if n_txn == 0:
        return None

    active_months = g['month'].nunique()
    total_spend = g['amt'].sum()
    if total_spend <= 0:
        return None

    # -- Spend level & volatility --
    mean_spend = g['amt'].mean()
    std_spend = g['amt'].std() if n_txn > 1 else 0.0
    spend_cv = std_spend / mean_spend if mean_spend > 0 else 0.0

    # -- Transaction frequency --
    txn_frequency = n_txn / active_months if active_months > 0 else float(n_txn)

    # -- Timing features --
    weekend_spend = g[g['is_weekend']]['amt'].sum()
    weekend_ratio = weekend_spend / total_spend

    late_night_spend = g[g['is_late_night']]['amt'].sum()
    late_night_ratio = late_night_spend / total_spend

    # -- Category percentages --
    cat_spend = g.groupby('app_category')['amt'].sum()
    pct = {}
    for cat in APP_CATEGORIES:
        pct[cat] = cat_spend.get(cat, 0) / total_spend

    # -- Merchant diversity --
    unique_merchants = g['merchant'].nunique()
    merchant_diversity = unique_merchants / n_txn

    # -- Large transaction ratio --
    p75 = g['amt'].quantile(0.75)
    large_txn_spend = g[g['amt'] > p75]['amt'].sum()
    large_txn_ratio = large_txn_spend / total_spend

    # -- Monthly consistency --
    monthly_totals = g.groupby('month')['amt'].sum().sort_index()
    if len(monthly_totals) > 1:
        monthly_mean = monthly_totals.mean()
        monthly_std = monthly_totals.std()
        monthly_spend_cv = monthly_std / monthly_mean if monthly_mean > 0 else 0.0
    else:
        monthly_spend_cv = 0.0

    # -- Transaction regularity --
    dates_sorted = g['datetime'].sort_values()
    if len(dates_sorted) > 1:
        gaps = dates_sorted.diff().dropna().dt.total_seconds() / 86400  # days
        gap_std = gaps.std()
        txn_regularity = 1.0 / (1.0 + gap_std)
    else:
        txn_regularity = 0.0

    # -- Spend trend --
    if len(monthly_totals) > 1:
        x = np.arange(len(monthly_totals))
        slope = np.polyfit(x, monthly_totals.values, 1)[0]
    else:
        slope = 0.0

    return {
        'mean_spend': mean_spend,
        'std_spend': std_spend,
        'spend_cv': spend_cv,
        'txn_frequency': txn_frequency,
        'weekend_ratio': weekend_ratio,
        'late_night_ratio': late_night_ratio,
        'pct_food': pct['food'],
        'pct_travel': pct['travel'],
        'pct_leisure': pct['leisure'],
        'pct_health': pct['health'],
        'merchant_diversity': merchant_diversity,
        'large_txn_ratio': large_txn_ratio,
        'monthly_spend_cv': monthly_spend_cv,
        'txn_regularity': txn_regularity,
        'spend_trend': slope,
        'n_active_months': active_months,
    }


# ---------------------------------------------------------------------------
# Persona prediction
# ---------------------------------------------------------------------------

def predict_persona(features_dict, model_data):
    feature_names = model_data['features']
    scaler = model_data['scaler']
    model = model_data['model']
    cluster_to_persona = model_data['cluster_to_persona']

    # Build feature vector in the correct order
    feature_vec = np.array([[features_dict[f] for f in feature_names]])

    # Scale
    X_scaled = scaler.transform(feature_vec)

    # Predict cluster
    cluster_id = model.predict(X_scaled)[0]

    # Confidence: distance-based
    # 1 - (dist_to_assigned / max_dist_to_any_centroid)
    distances = model.transform(X_scaled)[0]  # distances to each centroid
    dist_to_assigned = distances[cluster_id]
    max_dist = distances.max()
    if max_dist > 0:
        confidence = 1.0 - (dist_to_assigned / max_dist)
    else:
        confidence = 1.0

    persona_name = cluster_to_persona[int(cluster_id)]
    return persona_name, confidence, int(cluster_id)


# ---------------------------------------------------------------------------
# Domain traits
# ---------------------------------------------------------------------------

def compute_domain_traits(features_dict):
    traits = set()

    if features_dict['weekend_ratio'] > 0.37:
        traits.add('WEEKEND_BIAS')

    if features_dict['late_night_ratio'] > 0.34:
        traits.add('LATE_NIGHT_TENDENCY')

    if features_dict['spend_cv'] > 3.2 or features_dict['monthly_spend_cv'] > 0.55:
        traits.add('HIGH_VOLATILITY')

    cat_pcts = [
        features_dict['pct_food'],
        features_dict['pct_travel'],
        features_dict['pct_leisure'],
        features_dict['pct_health'],
    ]
    if any(p > 0.30 for p in cat_pcts):
        traits.add('CATEGORY_HEAVY')

    return frozenset(traits)


# ---------------------------------------------------------------------------
# Main evaluation
# ---------------------------------------------------------------------------

def main():
    # -- Load model --
    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              '..', 'trained_models', 'persona_kmeans.pkl')
    model_data = joblib.load(model_path)
    print(f"Loaded model from {model_path}")
    print(f"  Clusters: {model_data['selected_k']}, "
          f"Personas: {list(model_data['cluster_to_persona'].values())}")

    # -- Load and prepare data --
    df = load_sparkov()
    df = prepare_transactions(df)

    # Sort globally by datetime so "first N" is chronologically correct
    df = df.sort_values('datetime').reset_index(drop=True)

    # -- Identify qualifying users (same filter as build_sparkov_features.py) --
    # Users with >= 20 transactions AND >= 2 active months (using full history)
    user_stats = df.groupby('cc_num').agg(
        n_txn=('amt', 'size'),
        n_months=('month', 'nunique'),
    )
    qualifying_users = user_stats[
        (user_stats['n_txn'] >= 20) & (user_stats['n_months'] >= 2)
    ].index.tolist()

    print(f"\nQualifying users (>=20 txns, >=2 months): {len(qualifying_users)}")

    # -- Compute ground truth for each user (all transactions) --
    print("\nComputing ground truth personas (full history)...")
    ground_truth = {}  # cc_num -> {'persona', 'traits', 'features'}

    for cc_num in qualifying_users:
        user_txns = df[df['cc_num'] == cc_num]
        features = compute_features_from_txns(user_txns)
        if features is None:
            continue
        persona, conf, cluster = predict_persona(features, model_data)
        traits = compute_domain_traits(features)
        ground_truth[cc_num] = {
            'persona': persona,
            'confidence': conf,
            'cluster': cluster,
            'traits': traits,
            'features': features,
        }

    n_users = len(ground_truth)
    print(f"  Ground truth computed for {n_users} users")

    # Show persona distribution
    persona_counts = {}
    for gt in ground_truth.values():
        p = gt['persona']
        persona_counts[p] = persona_counts.get(p, 0) + 1
    print(f"  Persona distribution: {persona_counts}")

    # -- Evaluate each threshold --
    print(f"\nEvaluating thresholds: {THRESHOLDS}")

    # Results: threshold -> list of per-user results
    threshold_results = {n: [] for n in THRESHOLDS}

    users_processed = 0
    for cc_num in ground_truth:
        user_txns = df[df['cc_num'] == cc_num].sort_values('datetime')
        gt = ground_truth[cc_num]
        users_processed += 1

        if users_processed % 100 == 0:
            print(f"  Processed {users_processed}/{n_users} users...")

        for n in THRESHOLDS:
            if len(user_txns) < n:
                # Not enough transactions for this threshold
                threshold_results[n].append({
                    'cc_num': cc_num,
                    'has_enough': False,
                })
                continue

            subset = user_txns.head(n)
            features = compute_features_from_txns(subset)

            if features is None:
                threshold_results[n].append({
                    'cc_num': cc_num,
                    'has_enough': False,
                })
                continue

            persona, conf, cluster = predict_persona(features, model_data)
            traits = compute_domain_traits(features)

            threshold_results[n].append({
                'cc_num': cc_num,
                'has_enough': True,
                'persona': persona,
                'confidence': conf,
                'cluster': cluster,
                'traits': traits,
                'n_active_months': features['n_active_months'],
                'match': persona == gt['persona'],
                'trait_match': traits == gt['traits'],
            })

    # -- Print results table --
    print()
    print("PERSONA UNLOCK THRESHOLD EVALUATION")
    print("=" * 75)
    print(f"Users evaluated: {n_users}")
    print(f"Ground truth: full transaction history per user")
    print()
    print(f"{'Threshold':>10} | {'Match%':>8} | {'Avg Confidence':>15} | "
          f"{'Trait Stability':>15} | {'Users w/ 2+ months':>20}")
    print(f"{'-'*10}-+-{'-'*8}-+-{'-'*15}-+-{'-'*15}-+-{'-'*20}")

    for n in THRESHOLDS:
        results = [r for r in threshold_results[n] if r['has_enough']]
        n_with_data = len(results)

        if n_with_data == 0:
            print(f"{'N='+str(n):>10} | {'N/A':>8} | {'N/A':>15} | "
                  f"{'N/A':>15} | {'N/A':>20}")
            continue

        matches = sum(1 for r in results if r['match'])
        match_pct = 100.0 * matches / n_with_data

        avg_conf = 100.0 * np.mean([r['confidence'] for r in results])

        trait_matches = sum(1 for r in results if r['trait_match'])
        trait_pct = 100.0 * trait_matches / n_with_data

        multi_month = sum(1 for r in results if r['n_active_months'] >= 2)
        multi_month_pct = 100.0 * multi_month / n_with_data

        print(f"{'N='+str(n):>10} | {match_pct:>7.1f}% | {avg_conf:>13.1f}%  | "
              f"{trait_pct:>13.1f}%  | {multi_month:>8d} ({multi_month_pct:.0f}%)")

    # -- Stability after unlock --
    print()
    print("STABILITY AFTER UNLOCK")
    print("=" * 75)

    # Build per-user persona at each threshold
    user_personas_at_threshold = {}  # cc_num -> {n: persona}
    for n in THRESHOLDS:
        for r in threshold_results[n]:
            if r['has_enough']:
                cc = r['cc_num']
                if cc not in user_personas_at_threshold:
                    user_personas_at_threshold[cc] = {}
                user_personas_at_threshold[cc][n] = r['persona']

    for i, unlock_n in enumerate(THRESHOLDS[:-1]):
        later_thresholds = THRESHOLDS[i + 1:]
        # Users who have data at unlock_n
        users_at_unlock = [
            cc for cc in user_personas_at_threshold
            if unlock_n in user_personas_at_threshold[cc]
        ]

        parts = []
        for later_n in later_thresholds:
            # Users who have data at both unlock_n and later_n
            users_both = [
                cc for cc in users_at_unlock
                if later_n in user_personas_at_threshold[cc]
            ]
            if len(users_both) == 0:
                parts.append(f"N/A at N={later_n}")
                continue

            same = sum(
                1 for cc in users_both
                if user_personas_at_threshold[cc][unlock_n] == user_personas_at_threshold[cc][later_n]
            )
            pct = 100.0 * same / len(users_both)
            parts.append(f"{pct:.1f}% still same persona at N={later_n}")

        print(f"If unlocked at N={unlock_n}: {', '.join(parts)}")

    # -- Per-persona breakdown at key thresholds --
    print()
    print("PER-PERSONA MATCH RATE AT EACH THRESHOLD")
    print("=" * 75)

    persona_names = sorted(set(gt['persona'] for gt in ground_truth.values()))

    header = f"{'Persona':<22}"
    for n in THRESHOLDS:
        header += f" | {'N='+str(n):>7}"
    print(header)
    print("-" * len(header))

    for persona in persona_names:
        row = f"{persona:<22}"
        gt_users_for_persona = [
            cc for cc, gt in ground_truth.items() if gt['persona'] == persona
        ]
        for n in THRESHOLDS:
            results = [
                r for r in threshold_results[n]
                if r['has_enough'] and r['cc_num'] in gt_users_for_persona
            ]
            if len(results) == 0:
                row += f" | {'N/A':>7}"
            else:
                matches = sum(1 for r in results if r['match'])
                pct = 100.0 * matches / len(results)
                row += f" | {pct:>6.1f}%"
        print(row)

    # -- Recommendation --
    print()
    print("RECOMMENDATION")
    print("=" * 75)

    # Find the threshold with the best balance of match rate and confidence
    best_n = None
    best_score = -1
    for n in THRESHOLDS:
        results = [r for r in threshold_results[n] if r['has_enough']]
        if len(results) == 0:
            continue
        match_pct = 100.0 * sum(1 for r in results if r['match']) / len(results)
        avg_conf = 100.0 * np.mean([r['confidence'] for r in results])
        trait_pct = 100.0 * sum(1 for r in results if r['trait_match']) / len(results)

        # Score: weighted combination
        score = 0.5 * match_pct + 0.25 * avg_conf + 0.25 * trait_pct

        if score > best_score:
            best_score = score
            best_n = n

    # Check stability at best_n
    if best_n is not None:
        results_at_best = [r for r in threshold_results[best_n] if r['has_enough']]
        match_pct = 100.0 * sum(1 for r in results_at_best if r['match']) / len(results_at_best)
        avg_conf = 100.0 * np.mean([r['confidence'] for r in results_at_best])
        trait_pct = 100.0 * sum(1 for r in results_at_best if r['trait_match']) / len(results_at_best)

        # Check stability at next threshold
        next_idx = THRESHOLDS.index(best_n) + 1
        stability_note = ""
        if next_idx < len(THRESHOLDS):
            next_n = THRESHOLDS[next_idx]
            users_both = [
                cc for cc in user_personas_at_threshold
                if best_n in user_personas_at_threshold[cc] and next_n in user_personas_at_threshold[cc]
            ]
            if len(users_both) > 0:
                same = sum(
                    1 for cc in users_both
                    if user_personas_at_threshold[cc][best_n] == user_personas_at_threshold[cc][next_n]
                )
                stab_pct = 100.0 * same / len(users_both)
                stability_note = f", {stab_pct:.1f}% stable at N={next_n}"

        print(f"Based on the evaluation data, N={best_n} is the recommended unlock threshold:")
        print(f"  - Match rate vs ground truth: {match_pct:.1f}%")
        print(f"  - Average confidence: {avg_conf:.1f}%")
        print(f"  - Trait stability: {trait_pct:.1f}%")
        if stability_note:
            print(f"  - Post-unlock stability{stability_note}")
        print()

        # Also note tradeoffs
        if best_n > THRESHOLDS[0]:
            lower_n = THRESHOLDS[THRESHOLDS.index(best_n) - 1]
            lower_results = [r for r in threshold_results[lower_n] if r['has_enough']]
            if len(lower_results) > 0:
                lower_match = 100.0 * sum(1 for r in lower_results if r['match']) / len(lower_results)
                print(f"Tradeoff: lowering to N={lower_n} drops match rate to {lower_match:.1f}%, "
                      f"but allows earlier persona assignment.")

        if best_n < THRESHOLDS[-1]:
            higher_n = THRESHOLDS[THRESHOLDS.index(best_n) + 1]
            higher_results = [r for r in threshold_results[higher_n] if r['has_enough']]
            if len(higher_results) > 0:
                higher_match = 100.0 * sum(1 for r in higher_results if r['match']) / len(higher_results)
                print(f"Tradeoff: raising to N={higher_n} improves match rate to {higher_match:.1f}%, "
                      f"but delays persona assignment.")


if __name__ == '__main__':
    main()
