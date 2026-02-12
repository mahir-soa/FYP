import joblib
import numpy as np
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'trained_models')

PERSONA_LABELS = {
    'IMPULSIVE_SPENDER': 'Impulsive Spender',
    'CAUTIOUS_SAVER': 'Cautious Saver',
    'WEEKEND_SPLURGER': 'Weekend Splurger',
    'SUBSCRIPTION_HOARDER': 'Subscription Hoarder',
    'BALANCED_BUDGETER': 'Balanced Budgeter',
}

PERSONA_DESCRIPTIONS = {
    'IMPULSIVE_SPENDER': 'You tend to make spontaneous purchases with high spending variance. Stress seems to drive some of your spending.',
    'CAUTIOUS_SAVER': "You're consistent with your spending and rarely go over budget. Great discipline!",
    'WEEKEND_SPLURGER': 'Your spending spikes on weekends. Being mindful of weekend habits could help you save more.',
    'SUBSCRIPTION_HOARDER': 'You have multiple subscriptions, some of which you may not be using regularly.',
    'BALANCED_BUDGETER': "You maintain an even spread across categories and stay close to your budget targets.",
}


def load_kmeans():
    path = os.path.join(MODEL_DIR, 'persona_kmeans.pkl')
    return joblib.load(path)


def predict_persona(features):
    data = load_kmeans()
    model = data['model']
    scaler = data['scaler']
    feature_names = data['features']
    cluster_map = data['cluster_to_persona']

    X = np.array([[features.get(f, 0) for f in feature_names]])
    X_scaled = scaler.transform(X)

    cluster = model.predict(X_scaled)[0]
    distances = model.transform(X_scaled)[0]

    max_dist = distances.max()
    confidence = 1 - (distances[cluster] / max_dist) if max_dist > 0 else 0.5

    persona_type = cluster_map.get(int(cluster), 'BALANCED_BUDGETER')

    centroid = model.cluster_centers_[cluster]
    diffs = np.abs(X_scaled[0] - centroid)
    top_indices = np.argsort(diffs)[:3]
    top_features = [feature_names[i] for i in top_indices]

    emotional_flag = (
        features.get('stressed_spend_avg', 0) > features.get('neutral_spend_avg', 0) or
        features.get('stressed_txn_count', 0) > features.get('neutral_txn_count', 0) * 0.5
    )

    return {
        'persona_type': persona_type,
        'persona_label': PERSONA_LABELS.get(persona_type, 'Unknown'),
        'description': PERSONA_DESCRIPTIONS.get(persona_type, ''),
        'confidence': round(float(confidence), 4),
        'emotional_spender_flag': emotional_flag,
        'top_features': top_features,
    }
