import pandas as pd
import numpy as np
import joblib
import json
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import (accuracy_score, precision_score, recall_score, f1_score,
                             confusion_matrix, silhouette_score, davies_bouldin_score,
                             calinski_harabasz_score, adjusted_rand_score)

np.random.seed(42)

# 15 Sparkov-derived behavioural features for persona clustering
CLUSTER_FEATURES = [
    'mean_spend', 'std_spend', 'spend_cv',
    'txn_frequency',
    'weekend_ratio', 'late_night_ratio',
    'pct_food', 'pct_travel', 'pct_leisure', 'pct_health',
    'merchant_diversity', 'large_txn_ratio',
    'monthly_spend_cv', 'txn_regularity',
    'spend_trend',
]

OVERSPEND_FEATURES = [
    'total_spend', 'avg_txn', 'std_txn', 'max_txn',
    'pct_food', 'pct_travel', 'pct_leisure', 'pct_education', 'pct_other',
    'weekend_ratio',
    'stressed_spend_avg', 'excited_spend_avg', 'happy_spend_avg',
    'stressed_txn_count', 'excited_txn_count',
    'sub_count', 'inactive_ratio',
    'spending_trend',
    'debt_to_income_ratio', 'credit_score', 'savings_to_income_ratio',
]


def suggest_persona_name(centroid, feature_names):
    vals = dict(zip(feature_names, centroid))

    scores = {
        'WEEKEND_SPLURGER': 0,
        'CAUTIOUS_SAVER': 0,
        'ERRATIC_SPENDER': 0,
        'LATE_NIGHT_SPENDER': 0,
        'CATEGORY_FOCUSED': 0,
        'BIG_SPENDER': 0,
        'VOLATILE_SPENDER': 0,
        'BALANCED_SPENDER': 0,
    }

    mean_spend = vals.get('mean_spend', 0)
    std_spend = vals.get('std_spend', 0)
    spend_cv = vals.get('spend_cv', 0)
    weekend_ratio = vals.get('weekend_ratio', 0)
    late_night_ratio = vals.get('late_night_ratio', 0)
    merchant_div = vals.get('merchant_diversity', 0)
    large_txn = vals.get('large_txn_ratio', 0)
    monthly_cv = vals.get('monthly_spend_cv', 0)
    txn_reg = vals.get('txn_regularity', 0)
    txn_freq = vals.get('txn_frequency', 0)
    spend_trend = vals.get('spend_trend', 0)

    # Weekend splurger: high weekend ratio
    if weekend_ratio > 0.5:
        scores['WEEKEND_SPLURGER'] += 3
    elif weekend_ratio > 0.3:
        scores['WEEKEND_SPLURGER'] += 1

    # Cautious saver: low mean, low std, low spend_cv
    if mean_spend < -0.3:
        scores['CAUTIOUS_SAVER'] += 1
    if spend_cv < -0.3:
        scores['CAUTIOUS_SAVER'] += 2
    if monthly_cv < -0.3:
        scores['CAUTIOUS_SAVER'] += 1

    # Impulsive spender: high spend_cv, high large_txn_ratio
    if spend_cv > 0.3:
        scores['ERRATIC_SPENDER'] += 2
    if large_txn > 0.3:
        scores['ERRATIC_SPENDER'] += 1

    # Late night spender: high late_night_ratio
    if late_night_ratio > 0.5:
        scores['LATE_NIGHT_SPENDER'] += 3
    elif late_night_ratio > 0.3:
        scores['LATE_NIGHT_SPENDER'] += 1

    # Category focused: low merchant diversity, high regularity
    if merchant_div < -0.3:
        scores['CATEGORY_FOCUSED'] += 2
    if txn_reg > 0.3:
        scores['CATEGORY_FOCUSED'] += 1

    # Big spender: high mean_spend, growing trend
    if mean_spend > 0.5:
        scores['BIG_SPENDER'] += 3
    if spend_trend > 0.5 and mean_spend > 0:
        scores['BIG_SPENDER'] += 1

    # Volatile spender: high monthly_cv, high spend_cv, irregular
    if monthly_cv > 0.3:
        scores['VOLATILE_SPENDER'] += 1
    if spend_cv > 0.3 and txn_reg < 0:
        scores['VOLATILE_SPENDER'] += 2

    # Balanced: moderate everything, high merchant diversity
    if merchant_div > 0.3:
        scores['BALANCED_SPENDER'] += 1
    if abs(mean_spend) < 0.3 and abs(spend_cv) < 0.5:
        scores['BALANCED_SPENDER'] += 2

    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return 'BALANCED_SPENDER'
    return best


def run_stability_test(X_scaled, k, n_runs=50):
    silhouettes = []
    all_labels = []
    all_models = []

    for i in range(n_runs):
        km = KMeans(n_clusters=k, random_state=i, n_init=20, max_iter=500)
        labels = km.fit_predict(X_scaled)
        sil = silhouette_score(X_scaled, labels)
        silhouettes.append(sil)
        all_labels.append(labels)
        all_models.append(km)

    # Compute pairwise ARI across all runs
    ari_scores = []
    for i in range(n_runs):
        for j in range(i + 1, n_runs):
            ari_scores.append(adjusted_rand_score(all_labels[i], all_labels[j]))

    # Pick the run closest to the mean silhouette as representative
    mean_sil = np.mean(silhouettes)
    best_idx = int(np.argmin(np.abs(np.array(silhouettes) - mean_sil)))

    return {
        'sil_mean': float(np.mean(silhouettes)),
        'sil_std': float(np.std(silhouettes)),
        'ari_mean': float(np.mean(ari_scores)),
        'ari_std': float(np.std(ari_scores)),
        'best_model': all_models[best_idx],
        'best_labels': all_labels[best_idx],
    }


def find_optimal_k(X_scaled, k_range=range(2, 9), n_runs=50):
    FRAG_THRESHOLD = 0.10
    MIN_ARI = 0.60
    n_users = X_scaled.shape[0]
    results = {}

    # Stage 3 & 4: Evaluate each k
    print(f"\nStage 3-4: K Selection with Stability Testing (k={k_range.start} to {k_range.stop - 1}, {n_runs} runs each)")
    print("\u2550" * 100)
    header = f"{'k':>3} | {'Sil Mean':>9} {'Sil Std':>8} | {'ARI Mean':>9} {'ARI Std':>8} | {'DB':>7} {'CH':>9} | {'Sizes':<28} | {'Flags'}"
    print(header)
    print("\u2500" * 100)

    for k in k_range:
        stability = run_stability_test(X_scaled, k, n_runs)

        labels = stability['best_labels']
        model = stability['best_model']

        db_score = davies_bouldin_score(X_scaled, labels)
        ch_score = calinski_harabasz_score(X_scaled, labels)

        sizes = [int(np.sum(labels == c)) for c in range(k)]
        min_size = min(sizes)
        min_pct = min_size / n_users

        # Stage 5: Flag problems
        fragmented = min_pct < FRAG_THRESHOLD
        unstable = stability['ari_mean'] < MIN_ARI

        # Centroid top features
        centroid_df = pd.DataFrame(model.cluster_centers_, columns=CLUSTER_FEATURES)
        top_features = {}
        for c in range(k):
            top = centroid_df.iloc[c].abs().nlargest(3)
            top_features[int(c)] = dict(top.round(3))

        results[k] = {
            'sil_mean': stability['sil_mean'],
            'sil_std': stability['sil_std'],
            'ari_mean': stability['ari_mean'],
            'ari_std': stability['ari_std'],
            'davies_bouldin': db_score,
            'calinski_harabasz': ch_score,
            'sizes': sizes,
            'min_size': min_size,
            'min_pct': min_pct,
            'fragmented': fragmented,
            'unstable': unstable,
            'top_features': top_features,
            'model': model,
        }

        flags = []
        if fragmented:
            flags.append("\u26a0 Fragmented")
        if unstable:
            flags.append("\u26a0 Unstable")
        flag_str = ", ".join(flags) if flags else "\u2713"

        print(f"k={k}  | {stability['sil_mean']:.4f}    {stability['sil_std']:.4f}  "
              f"| {stability['ari_mean']:.4f}    {stability['ari_std']:.4f}  "
              f"| {db_score:.3f}  {ch_score:>8.1f}  "
              f"| {str(sizes):<28s} | {flag_str}")

    # Stage 5: Eliminate bad candidates
    print(f"\nStage 5: Elimination")
    print("\u2500" * 60)
    viable = []
    for k in k_range:
        r = results[k]
        reasons = []
        if r['fragmented']:
            reasons.append(f"fragmented (smallest cluster {r['min_pct']:.0%})")
        if r['unstable']:
            reasons.append(f"unstable (ARI={r['ari_mean']:.3f})")
        if reasons:
            print(f"  k={k}: REJECTED \u2014 {', '.join(reasons)}")
        else:
            viable.append(k)
            print(f"  k={k}: VIABLE")

    if not viable:
        print("  All k values rejected \u2014 falling back to highest mean silhouette.")
        viable = list(k_range)

    # Stage 6: Compare finalists
    print(f"\nStage 6: Finalist Comparison (viable: {viable})")
    print("\u2500" * 60)

    for k in viable:
        r = results[k]
        print(f"\n  k={k} \u2014 Silhouette: {r['sil_mean']:.4f} \u00b1 {r['sil_std']:.4f}, "
              f"ARI: {r['ari_mean']:.4f} \u00b1 {r['ari_std']:.4f}")
        print(f"    Sizes: {r['sizes']}, Davies-Bouldin: {r['davies_bouldin']:.3f}, "
              f"Calinski-Harabasz: {r['calinski_harabasz']:.1f}")
        print(f"    Cluster Centroid Profiles:")
        for c in range(k):
            features = r['top_features'][c]
            feat_str = ", ".join(f"{f}={v:.2f}" for f, v in features.items())
            print(f"      Cluster {c}: {feat_str}")

    # Selection: best silhouette among viable
    best_k = max(viable, key=lambda k: results[k]['sil_mean'])

    r = results[best_k]
    print(f"\n\u2192 Selected k={best_k}")
    print(f"  Silhouette: {r['sil_mean']:.4f} \u00b1 {r['sil_std']:.4f}")
    print(f"  Stability (ARI): {r['ari_mean']:.4f} \u00b1 {r['ari_std']:.4f}")
    print(f"  Cluster sizes: {r['sizes']} (min {r['min_pct']:.0%})")
    print(f"  Davies-Bouldin: {r['davies_bouldin']:.3f}")
    print(f"  Calinski-Harabasz: {r['calinski_harabasz']:.1f}")

    return best_k, results


def print_centroid_profiles(kmeans, feature_names, cluster_names):
    centroids = kmeans.cluster_centers_
    k = centroids.shape[0]

    print(f"\n{'='*100}")
    print("DETAILED CENTROID PROFILES (scaled feature values)")
    print(f"{'='*100}")

    for c in range(k):
        name = cluster_names.get(int(c), f'Cluster_{c}')
        print(f"\n  Cluster {c} \u2014 Suggested: {name}")
        print(f"  {'Feature':<25} {'Value':>8}  {'Bar'}")
        print(f"  {'-'*60}")
        for i, feat in enumerate(feature_names):
            val = centroids[c, i]
            # Visual bar: map roughly -3..+3 to a bar
            bar_len = int(max(0, min(20, (val + 3) / 6 * 20)))
            bar = '\u2588' * bar_len + '\u2591' * (20 - bar_len)
            print(f"  {feat:<25} {val:>8.3f}  |{bar}|")


def train_kmeans():
    print("=" * 60)
    print("MODEL 1: K-Means Persona Clustering (Sparkov)")
    print("=" * 60)

    # Stage 1: Load Sparkov user features
    print("\nStage 1: Loading Sparkov user-level behavioural features")
    user_features = pd.read_csv('ml/data/generated/sparkov_user_features.csv')
    print(f"  {len(user_features)} users, {len(CLUSTER_FEATURES)} behavioural features")

    # Stage 2: Preprocess
    print("\nStage 2: Preprocessing (winsorize, StandardScaler, outlier check)")
    X_df = user_features[CLUSTER_FEATURES].copy()

    # Winsorize: clip each feature to [1st, 99th] percentile to prevent
    # a handful of extreme users from forcing their own micro-cluster
    for col in X_df.columns:
        lo = X_df[col].quantile(0.01)
        hi = X_df[col].quantile(0.99)
        clipped = X_df[col].clip(lo, hi)
        n_clipped = (X_df[col] != clipped).sum()
        if n_clipped > 0:
            print(f"  Winsorized {col}: {n_clipped} values clipped to [{lo:.4f}, {hi:.4f}]")
        X_df[col] = clipped

    # Compute reference percentiles (P90) for domain trait thresholds
    # These are computed BEFORE winsorization so they reflect the true distribution
    trait_features = ['weekend_ratio', 'late_night_ratio', 'spend_cv', 'monthly_spend_cv',
                      'pct_food', 'pct_travel', 'pct_leisure', 'pct_health']
    reference_percentiles = {}
    for feat in trait_features:
        if feat in X_df.columns:
            reference_percentiles[feat] = {
                'p90': float(X_df[feat].quantile(0.90)),
                'p95': float(X_df[feat].quantile(0.95)),
            }
    print(f"\n  Reference percentiles (P90, used for domain trait thresholds):")
    for feat, pcts in reference_percentiles.items():
        print(f"    {feat}: P90={pcts['p90']:.4f}, P95={pcts['p95']:.4f}")

    X = X_df.values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Report any extreme values post-scaling
    extremes = np.abs(X_scaled) > 3
    n_extreme = extremes.sum()
    if n_extreme > 0:
        extreme_features = np.array(CLUSTER_FEATURES)[extremes.any(axis=0)]
        print(f"  {n_extreme} extreme values (|z|>3) in: {list(extreme_features)}")
    else:
        print(f"  No extreme outliers detected (all |z| <= 3)")

    # Stages 3-6: Find optimal k
    best_k, k_results = find_optimal_k(X_scaled)

    best = k_results[best_k]
    kmeans = best['model']
    clusters = kmeans.predict(X_scaled)

    # Post-hoc persona naming
    cluster_to_persona = {}
    for c in range(best_k):
        name = suggest_persona_name(kmeans.cluster_centers_[c], CLUSTER_FEATURES)
        cluster_to_persona[int(c)] = name

    # Deduplicate names: if two clusters get the same name, append _2, _3 etc.
    seen = {}
    for c in sorted(cluster_to_persona.keys()):
        name = cluster_to_persona[c]
        if name in seen:
            seen[name] += 1
            cluster_to_persona[c] = f"{name}_{seen[name]}"
        else:
            seen[name] = 1

    user_features['cluster'] = clusters

    print(f"\nFinal Model Summary (k={best_k})")
    print("\u2550" * 60)
    print("\nCluster -> Suggested Persona Name:")
    for c in range(best_k):
        cluster_users = user_features[user_features['cluster'] == c]
        print(f"  Cluster {c} ({len(cluster_users)} users): {cluster_to_persona[int(c)]}")

    # Detailed centroid profiles
    print_centroid_profiles(kmeans, CLUSTER_FEATURES, cluster_to_persona)

    # Serialise results
    serialisable_results = {}
    for k, r in k_results.items():
        serialisable_results[k] = {
            'sil_mean': r['sil_mean'],
            'sil_std': r['sil_std'],
            'ari_mean': r['ari_mean'],
            'ari_std': r['ari_std'],
            'davies_bouldin': r['davies_bouldin'],
            'calinski_harabasz': r['calinski_harabasz'],
            'sizes': r['sizes'],
            'min_pct': r['min_pct'],
            'fragmented': r['fragmented'],
            'unstable': r['unstable'],
            'top_features': r['top_features'],
        }

    joblib.dump({
        'model': kmeans,
        'scaler': scaler,
        'features': CLUSTER_FEATURES,
        'cluster_to_persona': cluster_to_persona,
        'silhouette_score': best['sil_mean'],
        'selected_k': best_k,
        'k_selection_results': serialisable_results,
        'reference_percentiles': reference_percentiles,
    }, 'ml/trained_models/persona_kmeans.pkl')

    print(f"\nSaved to ml/trained_models/persona_kmeans.pkl")
    print(f"\nNote: Persona names are post-hoc suggestions based on centroid profiles.")
    print(f"      They are inspectable and overridable in the pickle file.")


def print_classification_report(name, y_true, y_pred):
    print(f"\n  {name}:")
    print(f"    Accuracy:  {accuracy_score(y_true, y_pred):.4f}")
    print(f"    Precision: {precision_score(y_true, y_pred, zero_division=0):.4f}")
    print(f"    Recall:    {recall_score(y_true, y_pred, zero_division=0):.4f}")
    print(f"    F1:        {f1_score(y_true, y_pred, zero_division=0):.4f}")
    cm = confusion_matrix(y_true, y_pred)
    print(f"    Confusion Matrix:\n      {cm}")


def train_logistic_regression(df):
    print("\n" + "=" * 60)
    print("MODEL 2: Logistic Regression (Overspend Prediction)")
    print("=" * 60)

    X = df[OVERSPEND_FEATURES].values
    y = df['overspent_any_category'].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = LogisticRegression(random_state=42, max_iter=1000, class_weight='balanced')
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    print_classification_report("Overall overspend", y_test, y_pred)

    coefs = pd.Series(model.coef_[0], index=OVERSPEND_FEATURES).sort_values(key=abs, ascending=False)
    print(f"\n  Top feature coefficients (drivers of overspend):")
    for feat, coef in coefs.head(10).items():
        direction = "+" if coef > 0 else "-"
        print(f"    {direction} {feat}: {coef:.4f}")

    category_models = {}
    categories = ['food', 'travel', 'leisure', 'education', 'other']
    for cat in categories:
        label_col = f'overspent_{cat}'
        y_cat = df[label_col].values
        if y_cat.sum() == 0 or y_cat.sum() == len(y_cat):
            print(f"\n  Skipping {cat} (no variance in labels)")
            continue

        X_tr, X_te, y_tr, y_te = train_test_split(X, y_cat, test_size=0.2, random_state=42, stratify=y_cat)
        X_tr_s = scaler.transform(X_tr)
        X_te_s = scaler.transform(X_te)

        cat_model = LogisticRegression(random_state=42, max_iter=1000, class_weight='balanced')
        cat_model.fit(X_tr_s, y_tr)
        y_cat_pred = cat_model.predict(X_te_s)
        print_classification_report(f"Overspend: {cat}", y_te, y_cat_pred)
        category_models[cat] = cat_model

    joblib.dump({
        'model': model,
        'category_models': category_models,
        'scaler': scaler,
        'features': OVERSPEND_FEATURES,
        'coefficients': dict(coefs),
    }, 'ml/trained_models/overspend_model.pkl')

    print(f"\nSaved to ml/trained_models/overspend_model.pkl")


def main():
    # K-Means: Sparkov features
    train_kmeans()

    # Overspend model: synthetic feature table
    df = pd.read_csv('ml/data/generated/feature_table.csv')
    print(f"\nLoaded feature table: {df.shape[0]} rows, {df.shape[1]} columns")
    print(f"Overspend distribution: {df['overspent_any_category'].value_counts().to_dict()}\n")
    train_logistic_regression(df)

    print("\n" + "=" * 60)
    print("All models trained and saved to ml/trained_models/")
    print("=" * 60)


if __name__ == '__main__':
    main()
