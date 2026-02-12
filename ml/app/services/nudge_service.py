from datetime import datetime, timedelta

NUDGE_TEMPLATES = {
    'BUDGET_WARNING': {
        'title': 'Budget Alert: {category}',
        'message': "You've used {pct}% of your {category} budget with {days_left} days left this month. {explanation}",
        'priority': 'HIGH',
    },
    'BUDGET_EXCEEDED': {
        'title': 'Over Budget: {category}',
        'message': "You've exceeded your {category} budget by £{over_amount:.2f}. {explanation}",
        'priority': 'HIGH',
    },
    'EMOTIONAL_CHECKIN': {
        'title': 'Spending Check-in',
        'message': "Your spending tends to increase when you're feeling {mood}. Average spend when {mood}: £{mood_avg:.2f}. Take a moment before your next purchase.",
        'priority': 'MEDIUM',
    },
    'SPENDING_PATTERN': {
        'title': 'Weekend Spending Pattern',
        'message': "You spend {ratio:.1f}x more on weekends than weekdays. Consider setting a weekend budget to stay on track.",
        'priority': 'MEDIUM',
    },
    'SUBSCRIPTION_ALERT': {
        'title': 'Unused Subscription',
        'message': "You have {count} subscription(s) you haven't used in over 60 days. That's £{cost:.2f}/month you could save.",
        'priority': 'MEDIUM',
    },
    'SAVINGS_MILESTONE': {
        'title': 'Great Budgeting!',
        'message': "You're under budget in {count} categories this month. Keep it up!",
        'priority': 'LOW',
    },
}


def generate_nudges(features, persona, risk):
    nudges = []
    now = datetime.now()

    categories = ['food', 'travel', 'leisure', 'education', 'other']
    days_left = 30 - now.day if now.day < 30 else 1

    for cat in categories:
        adherence = features.get(f'adherence_{cat}', 0)

        if adherence > 1.0:
            budget_val = features.get('total_income', 0) * 0.2
            over_amount = budget_val * (adherence - 1.0)
            cat_risk = risk['category_risks'].get(cat, {})
            explanation = ''
            if cat_risk:
                explanation = f"Risk level: {cat_risk.get('risk_level', 'MEDIUM')}."
            if risk['top_drivers']:
                explanation += f" Key driver: {risk['top_drivers'][0]['explanation']}."

            nudges.append({
                'type': 'BUDGET_EXCEEDED',
                'title': NUDGE_TEMPLATES['BUDGET_EXCEEDED']['title'].format(category=cat.title()),
                'message': NUDGE_TEMPLATES['BUDGET_EXCEEDED']['message'].format(
                    category=cat.title(), over_amount=over_amount, explanation=explanation
                ),
                'priority': 'HIGH',
                'related_entity_type': 'BUDGET',
                'expires_at': (now + timedelta(days=7)).isoformat(),
            })
        elif adherence > 0.75:
            pct = round(adherence * 100)
            explanation = ''
            if risk['top_drivers']:
                explanation = f"Watch out: {risk['top_drivers'][0]['explanation']}."

            nudges.append({
                'type': 'BUDGET_WARNING',
                'title': NUDGE_TEMPLATES['BUDGET_WARNING']['title'].format(category=cat.title()),
                'message': NUDGE_TEMPLATES['BUDGET_WARNING']['message'].format(
                    category=cat.title(), pct=pct, days_left=days_left, explanation=explanation
                ),
                'priority': 'HIGH',
                'related_entity_type': 'BUDGET',
                'expires_at': (now + timedelta(days=3)).isoformat(),
            })

    if persona.get('emotional_spender_flag'):
        stressed_avg = features.get('stressed_spend_avg', 0)
        if stressed_avg > 0:
            nudges.append({
                'type': 'EMOTIONAL_CHECKIN',
                'title': NUDGE_TEMPLATES['EMOTIONAL_CHECKIN']['title'],
                'message': NUDGE_TEMPLATES['EMOTIONAL_CHECKIN']['message'].format(
                    mood='stressed', mood_avg=stressed_avg
                ),
                'priority': 'MEDIUM',
                'related_entity_type': 'EXPENSE',
                'expires_at': (now + timedelta(days=7)).isoformat(),
            })

    weekend_ratio = features.get('weekend_ratio', 0)
    if weekend_ratio > 1.3:
        nudges.append({
            'type': 'SPENDING_PATTERN',
            'title': NUDGE_TEMPLATES['SPENDING_PATTERN']['title'],
            'message': NUDGE_TEMPLATES['SPENDING_PATTERN']['message'].format(ratio=weekend_ratio),
            'priority': 'MEDIUM',
            'related_entity_type': 'EXPENSE',
            'expires_at': (now + timedelta(days=14)).isoformat(),
        })

    inactive_ratio = features.get('inactive_ratio', 0)
    sub_count = features.get('sub_count', 0)
    if inactive_ratio > 0 and sub_count > 0:
        inactive_count = int(inactive_ratio * sub_count)
        inactive_cost = features.get('sub_total_cost', 0) * inactive_ratio
        if inactive_count > 0:
            nudges.append({
                'type': 'SUBSCRIPTION_ALERT',
                'title': NUDGE_TEMPLATES['SUBSCRIPTION_ALERT']['title'],
                'message': NUDGE_TEMPLATES['SUBSCRIPTION_ALERT']['message'].format(
                    count=inactive_count, cost=inactive_cost
                ),
                'priority': 'MEDIUM',
                'related_entity_type': 'SUBSCRIPTION',
                'expires_at': (now + timedelta(days=30)).isoformat(),
            })

    under_budget_count = sum(1 for cat in categories if features.get(f'adherence_{cat}', 0) < 0.8)
    if under_budget_count >= 3:
        nudges.append({
            'type': 'SAVINGS_MILESTONE',
            'title': NUDGE_TEMPLATES['SAVINGS_MILESTONE']['title'],
            'message': NUDGE_TEMPLATES['SAVINGS_MILESTONE']['message'].format(count=under_budget_count),
            'priority': 'LOW',
            'related_entity_type': 'BUDGET',
            'expires_at': (now + timedelta(days=7)).isoformat(),
        })

    return nudges
