import joblib
import numpy as np
import json
import os
from datetime import datetime, timedelta

import pandas as pd

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'trained_models')

# Known persona labels
PERSONA_LABELS = {
    'ERRATIC_SPENDER': 'Erratic Spender',
    'CAUTIOUS_SAVER': 'Cautious Saver',
    'WEEKEND_SPLURGER': 'Weekend Splurger',
    'BALANCED_SPENDER': 'Balanced Spender',
    'VOLATILE_SPENDER': 'Volatile Spender',
    'LATE_NIGHT_SPENDER': 'Late Night Spender',
    'CATEGORY_FOCUSED': 'Category Focused',
    'BIG_SPENDER': 'Big Spender',
    'INSUFFICIENT_DATA': 'Insufficient Data',
}

PERSONA_DESCRIPTIONS = {
    'ERRATIC_SPENDER': 'Your spending pattern is irregular with high variance between transactions and occasional large purchases.',
    'CAUTIOUS_SAVER': "You're consistent with low spending and rarely make large purchases. Great discipline!",
    'WEEKEND_SPLURGER': 'Your spending spikes on weekends. Being mindful of weekend habits could help you save more.',
    'BALANCED_SPENDER': 'You maintain a balanced spending pattern across categories with moderate consistency.',
    'VOLATILE_SPENDER': 'Your spending fluctuates significantly. Building consistent habits could stabilise your finances.',
    'LATE_NIGHT_SPENDER': 'A significant portion of your spending happens late at night. Planning ahead could help.',
    'CATEGORY_FOCUSED': 'Most of your spending is concentrated in one or two categories.',
    'BIG_SPENDER': 'You tend to spend more than average across categories. Tracking big purchases could help.',
    'INSUFFICIENT_DATA': 'We need more spending data to accurately determine your persona.',
}

# Nudge style per persona: controls sensitivity and tone
NUDGE_STYLES = {
    'ERRATIC_SPENDER': {
        'style': 'corrective',
        'budget_sensitivity': 0.70,    # warn earlier (at 70% of budget)
        'spike_alerts': True,
        'reinforcement': False,
    },
    'BIG_SPENDER': {
        'style': 'corrective',
        'budget_sensitivity': 0.65,    # warn even earlier
        'spike_alerts': True,
        'reinforcement': False,
    },
    'VOLATILE_SPENDER': {
        'style': 'corrective',
        'budget_sensitivity': 0.70,
        'spike_alerts': True,
        'reinforcement': False,
    },
    'BALANCED_SPENDER': {
        'style': 'reinforcement',
        'budget_sensitivity': 0.80,    # standard threshold
        'spike_alerts': False,
        'reinforcement': True,
    },
    'CAUTIOUS_SAVER': {
        'style': 'reinforcement',
        'budget_sensitivity': 0.85,    # relaxed, they're already careful
        'spike_alerts': False,
        'reinforcement': True,
    },
    'WEEKEND_SPLURGER': {
        'style': 'pacing',
        'budget_sensitivity': 0.75,
        'spike_alerts': True,
        'reinforcement': False,
    },
    'LATE_NIGHT_SPENDER': {
        'style': 'pacing',
        'budget_sensitivity': 0.75,
        'spike_alerts': False,
        'reinforcement': False,
    },
    'CATEGORY_FOCUSED': {
        'style': 'awareness',
        'budget_sensitivity': 0.75,
        'spike_alerts': False,
        'reinforcement': False,
    },
}

DEFAULT_NUDGE_STYLE = {
    'style': 'awareness',
    'budget_sensitivity': 0.80,
    'spike_alerts': False,
    'reinforcement': False,
}

CATEGORIES = ['Food', 'Travel', 'Leisure', 'Education', 'Other']

# Feature display names for explanations
FEATURE_EXPLANATIONS = {
    'mean_spend': 'average transaction amount',
    'std_spend': 'spending variability',
    'spend_cv': 'spending volatility relative to your average',
    'txn_frequency': 'how often you make purchases',
    'weekend_ratio': 'weekend spending as a share of total',
    'late_night_ratio': 'late-night spending (10pm–5am)',
    'pct_food': 'food spending share',
    'pct_travel': 'travel spending share',
    'pct_leisure': 'leisure spending share',
    'pct_health': 'health spending share',
    'merchant_diversity': 'variety of places you shop at',
    'large_txn_ratio': 'share of spend in large transactions',
    'monthly_spend_cv': 'month-to-month spending consistency',
    'txn_regularity': 'regularity of your purchase timing',
    'spend_trend': 'whether your spending is growing or shrinking',
}


AXIS_EXPLANATIONS = {
    'impulse': 'Your transaction amounts vary a lot and include occasional large purchases.',
    'volatility': 'Your month-to-month spending fluctuates significantly.',
    'budget_discipline': 'You frequently exceed your planned category budgets.',
    'weekend_bias': 'A noticeable share of your spending happens on weekends.',
    'late_night_activity': 'You make a significant number of purchases late at night.',
    'category_concentration': 'Most of your spending is concentrated in one or two categories.',
}

AXIS_EXPLANATIONS_LOW = {
    'budget_discipline': 'You tend to stay close to your planned category budgets.',
    'impulse': 'Your spending amounts are fairly consistent without big surprises.',
    'late_night_activity': 'Most of your spending happens during regular hours.',
}

PERSONA_MEANING = {
    'ERRATIC_SPENDER': 'Your spending profile is unpredictable, with high impulse and volatility scores. This means budgets are harder to stick to because individual transactions swing widely. Nudges are tuned to warn you earlier so you have time to pause before overspending.',
    'CAUTIOUS_SAVER': 'Your profile is one of the most disciplined we see. Low impulse and volatility scores mean your spending is steady and predictable. Keep leveraging this consistency — small optimisations can compound into meaningful savings.',
    'WEEKEND_SPLURGER': 'Your profile peaks around weekend spending. Weekday discipline is solid, but weekends introduce spikes that can quietly erode your budget. Nudges focus on pacing your weekend spend.',
    'BALANCED_SPENDER': 'Your profile is well-rounded with no single axis dominating. This balanced shape means you have no extreme risk areas, but there may still be room to tighten one or two dimensions for better results.',
    'VOLATILE_SPENDER': 'Your month-to-month totals swing more than most users. This volatility makes forecasting harder and can lead to surprise shortfalls. Nudges focus on smoothing out these swings.',
    'LATE_NIGHT_SPENDER': 'A notable share of your transactions happen after 10pm. Late-night purchases tend to be less deliberate. Nudges are timed to intercept before those sessions begin.',
    'CATEGORY_FOCUSED': 'Your spending is heavily concentrated in one or two categories. While focus is not inherently bad, it means a price increase in that category could hit your budget hard. Diversifying slightly may add resilience.',
    'BIG_SPENDER': 'Your average transaction size is higher than most users. Large individual purchases drive your impulse score up. Nudges use a tighter threshold so you get earlier warnings on big-ticket items.',
    'INSUFFICIENT_DATA': 'We don\'t have enough data yet to give a meaningful shape interpretation. Keep logging expenses and your profile will sharpen over time.',
    'NEUTRAL': 'Your spending profile doesn\'t strongly match any single pattern. As more data comes in, the shape will become more distinct and the interpretation more precise.',
}

AXIS_ACTIONS = {
    'impulse': 'Pause before larger discretionary purchases this week.',
    'volatility': 'Set a fixed weekly spending ceiling and check progress mid-week.',
    'budget_discipline': 'Review the categories where you went over budget and tighten limits.',
    'weekend_bias': 'Plan weekend activities in advance and pre-set a weekend spending cap.',
    'late_night_activity': 'Set a spending curfew after 10pm for non-essential purchases.',
    'category_concentration': 'Check if your top category has cheaper alternatives you haven\'t tried.',
}


def build_spider_explanation(spider_axes, persona_type):
    if not spider_axes:
        return {'topDrivers': [], 'meaningSummary': '', 'nextActions': []}

    axis_labels = {
        'impulse': 'Impulse',
        'volatility': 'Volatility',
        'budget_discipline': 'Budget Discipline',
        'weekend_bias': 'Weekend Bias',
        'late_night_activity': 'Late Night',
        'category_concentration': 'Category Focus',
    }

    concerns = []
    for axis, score in spider_axes.items():
        if axis == 'budget_discipline':
            concern_score = 100 - score  # low discipline = high concern
        else:
            concern_score = score
        concerns.append((axis, score, concern_score))

    concerns.sort(key=lambda x: x[2], reverse=True)

    top_drivers = []
    for axis, score, _ in concerns[:2]:
        explanation = AXIS_EXPLANATIONS.get(axis, '')
        top_drivers.append({
            'axis': axis,
            'label': axis_labels.get(axis, axis),
            'score': score,
            'explanation': explanation,
            'direction': 'concern',
        })

    strength_added = False
    if spider_axes.get('budget_discipline', 0) > 70:
        if not any(d['axis'] == 'budget_discipline' for d in top_drivers):
            top_drivers.append({
                'axis': 'budget_discipline',
                'label': axis_labels['budget_discipline'],
                'score': spider_axes['budget_discipline'],
                'explanation': AXIS_EXPLANATIONS_LOW['budget_discipline'],
                'direction': 'strength',
            })
            strength_added = True

    if not strength_added and spider_axes.get('impulse', 100) < 25:
        if not any(d['axis'] == 'impulse' for d in top_drivers):
            top_drivers.append({
                'axis': 'impulse',
                'label': axis_labels['impulse'],
                'score': spider_axes['impulse'],
                'explanation': AXIS_EXPLANATIONS_LOW['impulse'],
                'direction': 'strength',
            })
            strength_added = True

    if not strength_added and spider_axes.get('late_night_activity', 100) < 15:
        if not any(d['axis'] == 'late_night_activity' for d in top_drivers):
            top_drivers.append({
                'axis': 'late_night_activity',
                'label': axis_labels['late_night_activity'],
                'score': spider_axes['late_night_activity'],
                'explanation': AXIS_EXPLANATIONS_LOW['late_night_activity'],
                'direction': 'strength',
            })

    meaning_summary = PERSONA_MEANING.get(persona_type, PERSONA_MEANING['NEUTRAL'])

    next_actions = []
    for driver in top_drivers:
        if driver['direction'] == 'concern' and driver['axis'] in AXIS_ACTIONS:
            next_actions.append(AXIS_ACTIONS[driver['axis']])
        if len(next_actions) >= 2:
            break

    return {
        'topDrivers': top_drivers,
        'meaningSummary': meaning_summary,
        'nextActions': next_actions,
    }


def _get_persona_label(persona_type):
    return PERSONA_LABELS.get(persona_type, persona_type.replace('_', ' ').title())


def _get_persona_description(persona_type):
    return PERSONA_DESCRIPTIONS.get(
        persona_type,
        f'Your spending pattern has been classified as {persona_type.replace("_", " ").lower()}.'
    )


def load_kmeans():
    path = os.path.join(MODEL_DIR, 'persona_kmeans.pkl')
    return joblib.load(path)


# A. BASE PERSONA

def _predict_base_persona(clustering_features):
    data = load_kmeans()
    model = data['model']
    scaler = data['scaler']
    feature_names = data['features']
    cluster_map = data['cluster_to_persona']

    X = np.array([[clustering_features.get(f, 0) for f in feature_names]])
    X_scaled = scaler.transform(X)

    cluster = model.predict(X_scaled)[0]
    distances = model.transform(X_scaled)[0]

    max_dist = distances.max()
    confidence = 1 - (distances[cluster] / max_dist) if max_dist > 0 else 0.5

    persona_type = cluster_map.get(int(cluster), 'BALANCED_SPENDER')

    # Top features: those closest to centroid (strongest match reasons)
    centroid = model.cluster_centers_[cluster]
    feature_vals = X_scaled[0]
    # Use absolute centroid values as "importance": which features define this cluster
    centroid_abs = np.abs(centroid)
    top_indices = np.argsort(centroid_abs)[::-1][:3]
    top_features = [feature_names[i] for i in top_indices]

    return {
        'persona_type': persona_type,
        'persona_label': _get_persona_label(persona_type),
        'description': _get_persona_description(persona_type),
        'confidence': round(float(confidence), 4),
        'top_features': top_features,
        'cluster_fit': round(float(confidence) * 100, 1),
    }


# B. EMOTIONAL SPENDING (data-driven)

def compute_emotional_spending(features):
    """Score emotional spending from user-reported moods on expenses (0-100).

    Uses the mood tags users attach to each expense in the logger.
    Four signals, each scaled 0-100 then weighted:
      1. Stressed spending share  (35%) — % of spend logged as Stressed
      2. Sad spending share       (25%) — % of spend logged as Sad
      3. Negative mood frequency  (20%) — fraction of transactions tagged Stressed/Sad
      4. Mood-driven overspend    (20%) — whether Stressed/Sad avg txn > overall avg
    """
    reasons = []

    total_txns = features.get('txn_count', 0)
    avg_txn = features.get('avg_txn', 0)
    total_spend = features.get('total_spend', 0)

    stressed_count = features.get('stressed_txn_count', 0)
    stressed_avg = features.get('stressed_spend_avg', 0)
    sad_count = features.get('sad_txn_count', 0)
    sad_avg = features.get('sad_spend_avg', 0)
    happy_count = features.get('happy_txn_count', 0)
    excited_count = features.get('excited_txn_count', 0)
    neutral_count = features.get('neutral_txn_count', 0)

    moods_logged = stressed_count + sad_count + happy_count + excited_count + neutral_count

    # If no moods logged at all, return a clean zero state
    if moods_logged == 0:
        return {
            'score': 0,
            'level': 'none',
            'summary': 'No mood data yet. Tag your expenses with a mood to see emotional spending insights.',
            'reasons': [],
            'components': {
                'stressed_share': 0,
                'sad_share': 0,
                'negative_frequency': 0,
                'mood_overspend': 0,
            },
        }

    # 1. Stressed spending share — what % of total spend was logged as Stressed
    stressed_spend = stressed_avg * stressed_count
    stressed_share = (stressed_spend / max(total_spend, 0.01)) if total_spend > 0 else 0
    stressed_score = min(100, (stressed_share / 0.40) * 100)
    if stressed_count > 0:
        reasons.append(f"{stressed_count} expense{'s' if stressed_count != 1 else ''} logged as Stressed (£{stressed_spend:.0f} total)")

    # 2. Sad spending share
    sad_spend = sad_avg * sad_count
    sad_share = (sad_spend / max(total_spend, 0.01)) if total_spend > 0 else 0
    sad_score = min(100, (sad_share / 0.30) * 100)
    if sad_count > 0:
        reasons.append(f"{sad_count} expense{'s' if sad_count != 1 else ''} logged as Sad (£{sad_spend:.0f} total)")

    # 3. Negative mood frequency — fraction of mood-tagged txns that are Stressed or Sad
    negative_count = stressed_count + sad_count
    negative_freq = negative_count / max(moods_logged, 1)
    freq_score = min(100, (negative_freq / 0.50) * 100)
    if negative_freq > 0.25:
        reasons.append(f"{round(negative_freq * 100)}% of your mood-tagged expenses are Stressed or Sad")

    # 4. Mood-driven overspend — do you spend more when Stressed/Sad vs your average?
    if negative_count > 0 and avg_txn > 0:
        negative_avg = (stressed_spend + sad_spend) / negative_count
        overspend_ratio = negative_avg / max(avg_txn, 0.01)
        overspend_score = min(100, max(0, (overspend_ratio - 1.0) / 0.80) * 100)
        if overspend_ratio > 1.15:
            reasons.append(f"You spend {overspend_ratio:.1f}x more per purchase when Stressed or Sad")
    else:
        overspend_score = 0

    score = round(
        stressed_score * 0.35
        + sad_score * 0.25
        + freq_score * 0.20
        + overspend_score * 0.20,
        1,
    )

    if score >= 60:
        level = 'high'
        summary = 'A significant portion of your spending happens when you feel Stressed or Sad.'
    elif score >= 40:
        level = 'moderate'
        summary = 'Some of your spending is linked to negative moods.'
    elif score >= 20:
        level = 'mild'
        summary = 'Minor emotional spending patterns detected.'
    else:
        level = 'low'
        summary = 'Your spending is not strongly tied to negative moods.'

    return {
        'score': score,
        'level': level,
        'summary': summary,
        'reasons': reasons[:4],
        'components': {
            'stressed_share': round(stressed_score, 1),
            'sad_share': round(sad_score, 1),
            'negative_frequency': round(freq_score, 1),
            'mood_overspend': round(overspend_score, 1),
        },
    }


# C. DOMAIN TRAITS

def compute_domain_traits(features, clustering_features):
    # Thresholds are set at approximately P90 of the Sparkov reference
    # population (908 users), meaning the trait fires for users in the
    # top ~10% for that behaviour.
    traits = []

    # Weekend bias: P90 of clustering weekend_ratio = 0.37
    # weekend_ratio = weekend_spend / total_spend
    weekend_ratio = clustering_features.get('weekend_ratio', 0)
    if weekend_ratio > 0.37:
        traits.append('WEEKEND_BIAS')

    # Late-night tendency: P90 of late_night_ratio = 0.34
    late_night = clustering_features.get('late_night_ratio', 0)
    if late_night > 0.34:
        traits.append('LATE_NIGHT_TENDENCY')

    # Emotional spender — based on user-reported moods
    emo = compute_emotional_spending(features)
    if emo['score'] >= 40:
        traits.append('EMOTIONAL_SPENDER')

    # High volatility: P90 of spend_cv = 3.2, P90 of monthly_spend_cv = 0.55
    spend_cv = clustering_features.get('spend_cv', 0)
    monthly_cv = clustering_features.get('monthly_spend_cv', 0)
    if spend_cv > 3.2 or monthly_cv > 0.55:
        traits.append('HIGH_VOLATILITY')

    # Category heavy: P90 of pct_food = 0.30, pct_leisure = 0.32
    # Uses clustering features for consistency with persona model
    for cat in ['food', 'travel', 'leisure', 'health']:
        pct = clustering_features.get(f'pct_{cat}', 0)
        if pct > 0.30:
            traits.append(f'CATEGORY_HEAVY_{cat.upper()}')
            break
    else:
        # Check "other" from full features (not in clustering features)
        pct_other = features.get('pct_other', 0)
        if pct_other > 0.30:
            traits.append('CATEGORY_HEAVY_OTHER')

    # At risk of overspend
    adherence_vals = [features.get(f'adherence_{cat.lower()}', 0) for cat in CATEGORIES]
    over_budget_count = sum(1 for a in adherence_vals if a > 1.0)
    if over_budget_count >= 2:
        traits.append('AT_RISK_OF_OVERSPEND')

    return traits


# C. SPIDER / RADAR CHART

def compute_spider_axes(features, clustering_features):
    # Impulse: blend of three behavioural signals from clustering features.
    # Each component scaled 0–100 using Sparkov reference ranges.
    # - spend_cv: per-transaction volatility (P50≈1.8, P90≈3.2)
    # - large_txn_ratio: share of spend in big transactions (range 0.45–0.75)
    # - txn_regularity inverted: bursty/irregular timing (range 0.15–0.85)
    spend_cv = clustering_features.get('spend_cv', 0)
    large_txn = clustering_features.get('large_txn_ratio', 0)
    txn_reg = clustering_features.get('txn_regularity', 0.5)

    cv_component = min(100, (spend_cv / 4.0) * 100)
    lt_component = min(100, max(0, (large_txn - 0.45) / 0.30) * 100)
    irreg_component = min(100, (1 - txn_reg) * 120)

    impulse = max(0, min(100, cv_component * 0.4 + lt_component * 0.3 + irreg_component * 0.3))

    # Volatility from clustering's monthly_spend_cv (0–100 scale)
    monthly_cv = clustering_features.get('monthly_spend_cv', 0)
    volatility = min(100, monthly_cv * 100)

    # Budget discipline from adherence
    adherence_vals = [features.get(f'adherence_{cat.lower()}', 0) for cat in CATEGORIES]
    valid_adherence = [a for a in adherence_vals if a > 0]
    avg_adherence = sum(valid_adherence) / len(valid_adherence) if valid_adherence else 0.8
    budget_discipline = 100 - max(0, avg_adherence - 0.8) * 200
    budget_discipline = max(0, min(100, budget_discipline))

    # Weekend bias from full features (weekend_ratio is spend_weekend/spend_weekday)
    weekend_ratio = features.get('weekend_ratio', 0)
    weekend_bias = min(100, weekend_ratio * 40)

    # Late-night activity from clustering features
    late_night_ratio = clustering_features.get('late_night_ratio', 0)
    late_night_activity = min(100, late_night_ratio * 200)

    # Category concentration from clustering pct_* features
    pct_vals = [clustering_features.get(f'pct_{cat}', 0) for cat in ['food', 'travel', 'leisure', 'health']]
    pct_other = max(0, 1.0 - sum(pct_vals))
    all_pcts = pct_vals + [pct_other]
    hhi = sum(p ** 2 for p in all_pcts)
    category_concentration = max(0, min(100, (hhi - 0.20) / 0.80 * 100))

    return {
        'impulse': round(impulse, 1),
        'volatility': round(volatility, 1),
        'budget_discipline': round(budget_discipline, 1),
        'weekend_bias': round(weekend_bias, 1),
        'late_night_activity': round(late_night_activity, 1),
        'category_concentration': round(category_concentration, 1),
    }


# D. PERSONA EXPLANATION

def generate_explanation(persona_type, top_features, clustering_features):
    reasons = []
    for feat in top_features[:3]:
        val = clustering_features.get(feat, 0)
        label = FEATURE_EXPLANATIONS.get(feat, feat.replace('_', ' '))
        reasons.append(label)

    if len(reasons) >= 2:
        text = f"This persona is driven by your {reasons[0]} and {reasons[1]}."
    elif reasons:
        text = f"This persona is driven by your {reasons[0]}."
    else:
        text = "This persona is based on your overall spending pattern."

    return {
        'text': text,
        'reasons': [FEATURE_EXPLANATIONS.get(f, f.replace('_', ' ')) for f in top_features[:3]],
    }


# E. CONFIDENCE

def compute_confidence(clustering_features, expenses):
    from app.features.extract import extract_clustering_features

    cutoff_60 = datetime.now() - timedelta(days=60)
    recent_expenses = [e for e in expenses if e.date and pd.to_datetime(e.date) >= cutoff_60]
    data_sufficiency = min(100, (len(recent_expenses) / 60) * 100)

    windows = [30, 60, 90]
    window_types = []
    for w in windows:
        cutoff = datetime.now() - timedelta(days=w)
        windowed = [e for e in expenses if e.date and pd.to_datetime(e.date) >= cutoff]
        if len(windowed) >= 5:
            w_clustering = extract_clustering_features(windowed)
            if w_clustering:
                try:
                    result = _predict_base_persona(w_clustering)
                    window_types.append(result['persona_type'])
                except Exception:
                    pass

    if len(window_types) >= 2:
        most_common = max(set(window_types), key=window_types.count)
        agreement = window_types.count(most_common) / len(window_types)
        stability = agreement * 100
    else:
        stability = 50

    base_result = _predict_base_persona(clustering_features)
    cluster_fit = base_result.get('cluster_fit', 50)

    low_confidence = clustering_features.get('low_confidence', False)
    if low_confidence:
        data_sufficiency = min(data_sufficiency, 40)

    score = round(data_sufficiency * 0.30 + stability * 0.35 + cluster_fit * 0.35, 1)
    level = 'High' if score >= 70 else 'Medium' if score >= 40 else 'Low'

    return {
        'score': score,
        'level': level,
        'data_sufficiency': round(data_sufficiency, 1),
        'stability': round(stability, 1),
        'cluster_fit': round(cluster_fit, 1),
    }


# DISCIPLINE

def compute_discipline(features, expenses, budgets):
    adherence_vals = [features.get(f'adherence_{cat.lower()}', 0) for cat in CATEGORIES]
    valid_adherence = [a for a in adherence_vals if a > 0]
    avg_adherence = sum(valid_adherence) / len(valid_adherence) if valid_adherence else 1.0
    adherence_score = max(0, min(50, (1.0 - max(0, avg_adherence - 1.0)) * 50))

    total_budget = 0
    if budgets:
        total_budget = budgets[0].total_budget or 0
    daily_budget = total_budget / 30 if total_budget > 0 else float('inf')

    df_expenses = pd.DataFrame([{
        'amount': e.amount,
        'date': pd.to_datetime(e.date).date(),
    } for e in expenses if e.date])

    streak_days = 0
    streak_weeks = 0
    consistency_score = 0

    if len(df_expenses) > 0:
        daily_totals = df_expenses.groupby('date')['amount'].sum().sort_index()
        today = datetime.now().date()

        for i in range(90):
            d = today - timedelta(days=i)
            day_spend = daily_totals.get(d, 0)
            if day_spend <= daily_budget * 1.1:
                streak_days += 1
            else:
                break

        weekly_budget = total_budget / 4 if total_budget > 0 else float('inf')
        df_expenses_copy = df_expenses.copy()
        df_expenses_copy['date'] = pd.to_datetime(df_expenses_copy['date'])
        df_expenses_copy['week'] = df_expenses_copy['date'].dt.isocalendar().week
        df_expenses_copy['year'] = df_expenses_copy['date'].dt.year

        now = datetime.now()
        four_weeks_ago = now - timedelta(weeks=4)
        recent_exp = df_expenses_copy[df_expenses_copy['date'] >= four_weeks_ago]
        if len(recent_exp) > 0:
            weekly_totals = recent_exp.groupby(['year', 'week'])['amount'].sum()
            streak_weeks = sum(1 for _, total in weekly_totals.items() if total <= weekly_budget * 1.1)

        consistency_score = min(30, streak_days * 1.0)

    daily_std = features.get('daily_spend_std', 0)
    daily_mean = max(features.get('daily_spend_mean', 0.01), 0.01)
    cv = daily_std / daily_mean
    variance_score = max(0, min(20, (1 - min(cv, 1)) * 20))

    discipline_score = round(adherence_score + consistency_score + variance_score, 1)

    trend_val = features.get('spending_trend', 0)
    if trend_val < -5:
        trend = 'improving'
    elif trend_val > 5:
        trend = 'worsening'
    else:
        trend = 'stable'

    if discipline_score >= 75:
        feedback = f"Excellent discipline! You've kept spending on track for {streak_days} days in a row."
    elif discipline_score >= 50:
        feedback = f"Good progress — you're building solid habits. Current streak: {streak_days} days."
    elif discipline_score >= 25:
        feedback = f"Room for improvement. Try to stay within budget each day to build your streak."
    else:
        feedback = "Your spending is quite variable. Start small — aim to stay in budget for 3 consecutive days."

    return {
        'discipline_score': discipline_score,
        'streak_days_in_budget': streak_days,
        'streak_weeks_stable': streak_weeks,
        'trend': trend,
        'feedback_message': feedback,
    }


# PUBLIC API

def predict_persona(features):
    return _predict_base_persona(features)


def predict_persona_full(clustering_features, features, expenses, budgets, subscriptions, incomes):
    # A. Base persona
    base = _predict_base_persona(clustering_features)

    # B. Domain traits
    domain_traits = compute_domain_traits(features, clustering_features)

    # C. Spider axes
    spider = compute_spider_axes(features, clustering_features)

    # D. Explanation
    explanation = generate_explanation(
        base['persona_type'], base['top_features'], clustering_features
    )

    # E. Confidence
    confidence = compute_confidence(clustering_features, expenses)

    # Discipline
    discipline = compute_discipline(features, expenses, budgets)

    # Nudge style
    nudge_style = NUDGE_STYLES.get(base['persona_type'], DEFAULT_NUDGE_STYLE)

    # Emotional spending — data-driven from expenditure patterns
    emotional = compute_emotional_spending(features)
    emotional_flag = emotional['score'] >= 45

    # Provisional flag from clustering features
    provisional = clustering_features.get('provisional', False)

    return {
        'persona_type': base['persona_type'],
        'persona_primary': base['persona_type'],
        'persona_label': base['persona_label'],
        'description': base['description'],
        'confidence': base['confidence'],
        'confidence_data': confidence,
        'domain_traits': domain_traits,
        'spider_axes': spider,
        'explanation': explanation,
        'discipline': discipline,
        'nudge_style': nudge_style,
        'emotional_spender_flag': emotional_flag,
        'emotional_spending': emotional,
        'top_features': base['top_features'],
        'provisional': provisional,
    }
