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
    'FORECAST_WARNING': {
        'title': 'Projected Overspend',
        'message': "At your current pace, you're projected to spend £{projected:.2f} this month — {pct}% over your £{budget:.2f} budget.",
        'priority': 'HIGH',
    },
    'GOAL_STREAK': {
        'title': 'Streak Milestone Ahead!',
        'message': "You're {days_away} day(s) away from a {milestone}-day budget streak! Keep going!",
        'priority': 'LOW',
    },
    'POSITIVE_DISCIPLINE': {
        'title': 'Strong Discipline!',
        'message': "Your discipline score is {score}/100 — you're managing your spending exceptionally well.",
        'priority': 'LOW',
    },
    'CORRECTIVE_VOLATILITY': {
        'title': 'High Spending Volatility',
        'message': "Your spending volatility is high ({volatility}/100). Try to keep daily spending more consistent.",
        'priority': 'MEDIUM',
    },
}


def generate_nudges(features, persona, risk, discipline=None, spider=None):
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
                'nudge_type': 'Corrective',
                'trigger': f'{cat.title()} budget exceeded (adherence={adherence:.2f})',
                'timing': 'reactive',
                'severity': 'strong',
                'confidence': round(min(1.0, adherence - 1.0), 2),
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
                'nudge_type': 'Corrective',
                'trigger': f'{cat.title()} budget at {pct}%',
                'timing': 'reactive',
                'severity': 'medium',
                'confidence': round(adherence - 0.75, 2),
                'title': NUDGE_TEMPLATES['BUDGET_WARNING']['title'].format(category=cat.title()),
                'message': NUDGE_TEMPLATES['BUDGET_WARNING']['message'].format(
                    category=cat.title(), pct=pct, days_left=days_left, explanation=explanation
                ),
                'priority': 'HIGH',
                'related_entity_type': 'BUDGET',
                'expires_at': (now + timedelta(days=3)).isoformat(),
            })

    total_spend = features.get('total_spend', 0)
    days_elapsed = max(now.day, 1)
    total_income = features.get('total_income', 0)
    if total_income > 0:
        projected = (total_spend / days_elapsed) * 30
        if projected > total_income * 1.1:
            over_pct = round((projected / total_income - 1) * 100)
            nudges.append({
                'type': 'FORECAST_WARNING',
                'nudge_type': 'Forecast',
                'trigger': f'Projected spend £{projected:.0f} exceeds budget £{total_income:.0f} by {over_pct}%',
                'timing': 'preventive',
                'severity': 'medium',
                'confidence': round(min(1.0, over_pct / 100), 2),
                'title': NUDGE_TEMPLATES['FORECAST_WARNING']['title'],
                'message': NUDGE_TEMPLATES['FORECAST_WARNING']['message'].format(
                    projected=projected, pct=over_pct, budget=total_income
                ),
                'priority': 'HIGH',
                'related_entity_type': 'BUDGET',
                'expires_at': (now + timedelta(days=7)).isoformat(),
            })

    if persona.get('emotional_spender_flag'):
        stressed_avg = features.get('stressed_spend_avg', 0)
        if stressed_avg > 0:
            nudges.append({
                'type': 'EMOTIONAL_CHECKIN',
                'nudge_type': 'Reflective',
                'trigger': f'Stressed spending avg £{stressed_avg:.2f} elevated',
                'timing': 'reactive',
                'severity': 'medium',
                'confidence': round(min(1.0, stressed_avg / max(features.get('avg_txn', 1), 1)), 2),
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
            'nudge_type': 'Awareness',
            'trigger': f'Weekend ratio {weekend_ratio:.1f}x higher than weekdays',
            'timing': 'reactive',
            'severity': 'light',
            'confidence': round(min(1.0, (weekend_ratio - 1.0) / 2), 2),
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
                'nudge_type': 'Awareness',
                'trigger': f'{inactive_count} subscription(s) unused for 60+ days',
                'timing': 'reactive',
                'severity': 'light',
                'confidence': round(inactive_ratio, 2),
                'title': NUDGE_TEMPLATES['SUBSCRIPTION_ALERT']['title'],
                'message': NUDGE_TEMPLATES['SUBSCRIPTION_ALERT']['message'].format(
                    count=inactive_count, cost=inactive_cost
                ),
                'priority': 'MEDIUM',
                'related_entity_type': 'SUBSCRIPTION',
                'expires_at': (now + timedelta(days=30)).isoformat(),
            })

    if discipline:
        streak = discipline.get('streak_days_in_budget', 0)
        for milestone in [7, 14, 30]:
            days_away = milestone - streak
            if 0 < days_away <= 2:
                nudges.append({
                    'type': 'GOAL_STREAK',
                    'nudge_type': 'Goal',
                    'trigger': f'{days_away} day(s) from {milestone}-day streak',
                    'timing': 'preventive',
                    'severity': 'light',
                    'confidence': round(1 - (days_away / milestone), 2),
                    'title': NUDGE_TEMPLATES['GOAL_STREAK']['title'],
                    'message': NUDGE_TEMPLATES['GOAL_STREAK']['message'].format(
                        days_away=days_away, milestone=milestone
                    ),
                    'priority': 'LOW',
                    'related_entity_type': 'BUDGET',
                    'expires_at': (now + timedelta(days=3)).isoformat(),
                })
                break

    if discipline and discipline.get('discipline_score', 0) >= 75:
        score = discipline['discipline_score']
        nudges.append({
            'type': 'POSITIVE_DISCIPLINE',
            'nudge_type': 'Positive',
            'trigger': f'Discipline score {score}/100',
            'timing': 'reactive',
            'severity': 'light',
            'confidence': round(score / 100, 2),
            'title': NUDGE_TEMPLATES['POSITIVE_DISCIPLINE']['title'],
            'message': NUDGE_TEMPLATES['POSITIVE_DISCIPLINE']['message'].format(score=round(score)),
            'priority': 'LOW',
            'related_entity_type': 'BUDGET',
            'expires_at': (now + timedelta(days=7)).isoformat(),
        })
    else:
        under_budget_count = sum(1 for cat in categories if features.get(f'adherence_{cat}', 0) < 0.8)
        if under_budget_count >= 3:
            nudges.append({
                'type': 'SAVINGS_MILESTONE',
                'nudge_type': 'Positive',
                'trigger': f'Under budget in {under_budget_count} categories',
                'timing': 'reactive',
                'severity': 'light',
                'confidence': round(under_budget_count / 5, 2),
                'title': NUDGE_TEMPLATES['SAVINGS_MILESTONE']['title'],
                'message': NUDGE_TEMPLATES['SAVINGS_MILESTONE']['message'].format(count=under_budget_count),
                'priority': 'LOW',
                'related_entity_type': 'BUDGET',
                'expires_at': (now + timedelta(days=7)).isoformat(),
            })

    if spider and spider.get('volatility', 0) > 70:
        vol = spider['volatility']
        nudges.append({
            'type': 'CORRECTIVE_VOLATILITY',
            'nudge_type': 'Corrective',
            'trigger': f'Spider volatility axis {vol}/100',
            'timing': 'reactive',
            'severity': 'medium',
            'confidence': round(vol / 100, 2),
            'title': NUDGE_TEMPLATES['CORRECTIVE_VOLATILITY']['title'],
            'message': NUDGE_TEMPLATES['CORRECTIVE_VOLATILITY']['message'].format(volatility=round(vol)),
            'priority': 'MEDIUM',
            'related_entity_type': 'EXPENSE',
            'expires_at': (now + timedelta(days=14)).isoformat(),
        })

    return nudges
