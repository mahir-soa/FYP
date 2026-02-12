import joblib
import numpy as np
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'trained_models')

CATEGORIES = ['food', 'travel', 'leisure', 'education', 'other']

FEATURE_EXPLANATIONS = {
    'total_spend': 'total spending amount',
    'avg_txn': 'average transaction size',
    'std_txn': 'spending volatility',
    'max_txn': 'largest single transaction',
    'pct_food': 'food spending proportion',
    'pct_travel': 'travel spending proportion',
    'pct_leisure': 'leisure spending proportion',
    'pct_education': 'education spending proportion',
    'pct_other': 'other spending proportion',
    'weekend_ratio': 'weekend vs weekday spending',
    'stressed_spend_avg': 'average spend when stressed',
    'excited_spend_avg': 'average spend when excited',
    'happy_spend_avg': 'average spend when happy',
    'stressed_txn_count': 'number of stressed transactions',
    'excited_txn_count': 'number of excited transactions',
    'sub_count': 'number of subscriptions',
    'inactive_ratio': 'unused subscription ratio',
    'spending_trend': 'monthly spending trend',
    'debt_to_income_ratio': 'debt to income ratio',
    'credit_score': 'credit score',
    'savings_to_income_ratio': 'savings to income ratio',
}


def load_overspend_model():
    path = os.path.join(MODEL_DIR, 'overspend_model.pkl')
    return joblib.load(path)


def predict_risk(features):
    data = load_overspend_model()
    model = data['model']
    scaler = data['scaler']
    feature_names = data['features']
    coefficients = data['coefficients']
    category_models = data['category_models']

    X = np.array([[features.get(f, 0) for f in feature_names]])
    X_scaled = scaler.transform(X)

    overall_prob = model.predict_proba(X_scaled)[0][1]
    overall_risk = 'HIGH' if overall_prob > 0.7 else 'MEDIUM' if overall_prob > 0.4 else 'LOW'

    abs_coefs = sorted(coefficients.items(), key=lambda x: abs(x[1]), reverse=True)
    top_drivers = []
    for feat, coef in abs_coefs[:3]:
        direction = 'increases' if coef > 0 else 'decreases'
        explanation = FEATURE_EXPLANATIONS.get(feat, feat)
        top_drivers.append({
            'feature': feat,
            'coefficient': round(coef, 4),
            'direction': direction,
            'explanation': f'Your {explanation} {direction} overspend risk',
        })

    category_risks = {}
    for cat in CATEGORIES:
        if cat in category_models:
            cat_model = category_models[cat]
            cat_prob = cat_model.predict_proba(X_scaled)[0][1]
            cat_risk = 'HIGH' if cat_prob > 0.7 else 'MEDIUM' if cat_prob > 0.4 else 'LOW'
            category_risks[cat] = {
                'probability': round(float(cat_prob), 4),
                'risk_level': cat_risk,
            }

    return {
        'overall_probability': round(float(overall_prob), 4),
        'overall_risk': overall_risk,
        'top_drivers': top_drivers,
        'category_risks': category_risks,
    }
