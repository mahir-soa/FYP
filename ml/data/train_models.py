import pandas as pd
import numpy as np
import joblib
import json
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, silhouette_score

np.random.seed(42)

CLUSTER_FEATURES = [
    'avg_txn', 'std_txn', 'max_txn',
    'pct_food', 'pct_travel', 'pct_leisure', 'pct_education', 'pct_other',
    'weekend_ratio',
    'stressed_spend_avg', 'excited_spend_avg', 'happy_spend_avg', 'sad_spend_avg', 'neutral_spend_avg',
    'sub_count', 'inactive_ratio', 'sub_total_cost',
    'adherence_food', 'adherence_travel', 'adherence_leisure', 'adherence_education', 'adherence_other',
    'spending_trend',
    'debt_to_income_ratio', 'credit_score', 'savings_to_income_ratio',
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


def find_optimal_k(X_scaled, user_features, k_range=range(3, 9), preferred_k=5):
    FRAG_THRESHOLD = 0.10
    n_users = X_scaled.shape[0]
    results = {}

    print(f"\nK Selection Analysis (k={k_range.start} to {k_range.stop - 1})")
    print("\u2550" * 70)

    for k in k_range:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=20, max_iter=500)
        labels = kmeans.fit_predict(X_scaled)
        sil = silhouette_score(X_scaled, labels)

        sizes = [int(np.sum(labels == c)) for c in range(k)]
        min_size = min(sizes)
        min_pct = min_size / n_users
        fragmented = min_pct < FRAG_THRESHOLD

        user_features_temp = user_features.copy()
        user_features_temp['cluster'] = labels
        cluster_to_persona = {}
        for c in range(k):
            cluster_users = user_features_temp[user_features_temp['cluster'] == c]
            dominant = cluster_users['persona'].value_counts().index[0]
            cluster_to_persona[int(c)] = dominant

        centroid_df = pd.DataFrame(kmeans.cluster_centers_, columns=CLUSTER_FEATURES)
        top_features = {}
        for c in range(k):
            top = centroid_df.iloc[c].abs().nlargest(3)
            top_features[int(c)] = dict(top.round(3))

        results[k] = {
            'silhouette': sil,
            'sizes': sizes,
            'min_size': min_size,
            'min_pct': min_pct,
            'fragmented': fragmented,
            'cluster_to_persona': cluster_to_persona,
            'top_features': top_features,
            'model': kmeans,
        }

        sizes_str = str(sizes)
        flag = ""
        if fragmented:
            flag = " | \u26a0 Fragmented"
        elif len(set(cluster_to_persona.values())) < k:
            flag = " | \u26a0 Merged"
        print(f"k={k}  | Silhouette: {sil:.4f} | Sizes: {sizes_str:<30s}{flag}")

    if preferred_k in results and not results[preferred_k]['fragmented']:
        best_k = preferred_k
    else:
        best_k = None
        best_sil = -1
        for k in k_range:
            r = results[k]
            if not r['fragmented'] and r['silhouette'] > best_sil:
                best_sil = r['silhouette']
                best_k = k

        if best_k is None:
            best_k = max(k_range, key=lambda k: results[k]['silhouette'])
            print(f"\nAll k values show fragmentation — falling back to highest silhouette.")

    print(f"\n\u2192 Selected k={best_k} (silhouette={results[best_k]['silhouette']:.4f},"
          f" min cluster={results[best_k]['min_pct']:.0%} of users)")

    return best_k, results


def train_kmeans(df):
    print("=" * 60)
    print("MODEL 1: K-Means Clustering (data-driven k selection)")
    print("=" * 60)

    user_features = df.groupby('user_id')[CLUSTER_FEATURES].mean().reset_index()
    user_personas = df.groupby('user_id')['persona'].first().reset_index()
    user_features = user_features.merge(user_personas, on='user_id')

    X = user_features[CLUSTER_FEATURES].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    best_k, k_results = find_optimal_k(X_scaled, user_features)

    best = k_results[best_k]
    kmeans = best['model']
    clusters = kmeans.predict(X_scaled)
    sil_score = best['silhouette']
    cluster_map = best['cluster_to_persona']

    user_features['cluster'] = clusters

    print(f"\nFinal model: k={best_k}, Silhouette: {sil_score:.4f}")
    print("\nCluster -> Actual Persona mapping:")
    for c in range(best_k):
        cluster_users = user_features[user_features['cluster'] == c]
        persona_counts = cluster_users['persona'].value_counts()
        print(f"  Cluster {c} ({len(cluster_users)} users): {persona_counts.to_dict()}")

    print("\nCluster centroids (top distinguishing features per cluster):")
    centroid_df = pd.DataFrame(kmeans.cluster_centers_, columns=CLUSTER_FEATURES)
    for c in range(best_k):
        top = centroid_df.iloc[c].abs().nlargest(5)
        print(f"  Cluster {c} ({cluster_map[int(c)]}): {dict(top.round(3))}")

    serialisable_results = {}
    for k, r in k_results.items():
        serialisable_results[k] = {
            'silhouette': r['silhouette'],
            'sizes': r['sizes'],
            'min_pct': r['min_pct'],
            'fragmented': r['fragmented'],
            'cluster_to_persona': r['cluster_to_persona'],
            'top_features': r['top_features'],
        }

    joblib.dump({
        'model': kmeans,
        'scaler': scaler,
        'features': CLUSTER_FEATURES,
        'cluster_to_persona': cluster_map,
        'silhouette_score': sil_score,
        'selected_k': best_k,
        'k_selection_results': serialisable_results,
    }, 'ml/trained_models/persona_kmeans.pkl')

    print(f"\nSaved to ml/trained_models/persona_kmeans.pkl")


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
    df = pd.read_csv('ml/data/generated/feature_table.csv')
    print(f"Loaded feature table: {df.shape[0]} rows, {df.shape[1]} columns")
    print(f"Overspend distribution: {df['overspent_any_category'].value_counts().to_dict()}\n")

    train_kmeans(df)
    train_logistic_regression(df)

    print("\n" + "=" * 60)
    print("All models trained and saved to ml/trained_models/")
    print("=" * 60)


if __name__ == '__main__':
    main()
