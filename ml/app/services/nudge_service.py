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
    'WEEKEND_PACING': {
        'title': 'Weekend Ahead',
        'message': "Your spending tends to spike on weekends. You have £{remaining:.2f} left in your budget — consider setting a weekend cap.",
        'priority': 'MEDIUM',
    },
    'LATE_NIGHT_ALERT': {
        'title': 'Late-Night Spending',
        'message': "{pct}% of your spending happens between 10pm and 5am. Planning purchases during the day could help you stay on track.",
        'priority': 'MEDIUM',
    },
    'SPEND_TO_INCOME': {
        'title': 'Spending vs Income',
        'message': "You've spent {pct}% of your monthly income so far. {advice}",
        'priority': 'HIGH',
    },
    'PERSONA_REINFORCEMENT': {
        'title': 'Keep It Up!',
        'message': "{message}",
        'priority': 'LOW',
    },
}


def generate_nudges(features, persona, risk, discipline=None, spider=None):
    nudges = []
    now = datetime.now()

    persona_type = persona.get('persona_type', '')
    domain_traits = persona.get('domain_traits', [])
    nudge_style = persona.get('nudge_style', {})
    budget_sensitivity = nudge_style.get('budget_sensitivity', 0.80)

    categories = ['food', 'travel', 'leisure', 'education', 'other']
    days_left = 30 - now.day if now.day < 30 else 1

    # Budget warnings: threshold adjusted by persona
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
        elif adherence > budget_sensitivity:
            pct = round(adherence * 100)
            explanation = ''
            if risk['top_drivers']:
                explanation = f"Watch out: {risk['top_drivers'][0]['explanation']}."

            nudges.append({
                'type': 'BUDGET_WARNING',
                'nudge_type': 'Corrective',
                'trigger': f'{cat.title()} budget at {pct}% (threshold={budget_sensitivity:.0%})',
                'timing': 'reactive',
                'severity': 'medium',
                'confidence': round(adherence - budget_sensitivity, 2),
                'title': NUDGE_TEMPLATES['BUDGET_WARNING']['title'].format(category=cat.title()),
                'message': NUDGE_TEMPLATES['BUDGET_WARNING']['message'].format(
                    category=cat.title(), pct=pct, days_left=days_left, explanation=explanation
                ),
                'priority': 'HIGH',
                'related_entity_type': 'BUDGET',
                'expires_at': (now + timedelta(days=3)).isoformat(),
            })

    # Spend-to-income check: stronger for BIG_SPENDER, ERRATIC_SPENDER
    total_spend = features.get('total_spend', 0)
    days_elapsed = max(now.day, 1)
    total_income = features.get('total_income', 0)
    if total_income > 0:
        projected = (total_spend / days_elapsed) * 30
        spend_pct = round((total_spend / total_income) * 100)

        # Forecast warning
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

        # Spend-to-income for big/impulsive spenders at lower threshold
        if persona_type in ('BIG_SPENDER', 'ERRATIC_SPENDER') and spend_pct > 60:
            advice = "Consider reviewing large recent purchases." if persona_type == 'BIG_SPENDER' \
                else "Try the 24-hour rule before your next non-essential purchase."
            nudges.append({
                'type': 'SPEND_TO_INCOME',
                'nudge_type': 'Awareness',
                'trigger': f'Spend-to-income at {spend_pct}% for {persona_type}',
                'timing': 'preventive',
                'severity': 'medium',
                'confidence': round(min(1.0, spend_pct / 100), 2),
                'title': NUDGE_TEMPLATES['SPEND_TO_INCOME']['title'],
                'message': NUDGE_TEMPLATES['SPEND_TO_INCOME']['message'].format(
                    pct=spend_pct, advice=advice
                ),
                'priority': 'HIGH',
                'related_entity_type': 'BUDGET',
                'expires_at': (now + timedelta(days=7)).isoformat(),
            })

    # Emotional check-in: triggered by EMOTIONAL_SPENDER trait
    if 'EMOTIONAL_SPENDER' in domain_traits:
        stressed_avg = features.get('stressed_spend_avg', 0)
        if stressed_avg > 0:
            nudges.append({
                'type': 'EMOTIONAL_CHECKIN',
                'nudge_type': 'Reflective',
                'trigger': f'EMOTIONAL_SPENDER trait + stressed avg £{stressed_avg:.2f}',
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

    # Weekend pacing: triggered by WEEKEND_BIAS trait
    if 'WEEKEND_BIAS' in domain_traits:
        weekend_ratio = features.get('weekend_ratio', 0)
        remaining = max(0, total_income - total_spend) if total_income > 0 else 0
        nudges.append({
            'type': 'WEEKEND_PACING',
            'nudge_type': 'Awareness',
            'trigger': f'WEEKEND_BIAS trait (ratio={weekend_ratio:.1f}x)',
            'timing': 'preventive',
            'severity': 'light',
            'confidence': round(min(1.0, (weekend_ratio - 1.0) / 2), 2),
            'title': NUDGE_TEMPLATES['WEEKEND_PACING']['title'],
            'message': NUDGE_TEMPLATES['WEEKEND_PACING']['message'].format(remaining=remaining),
            'priority': 'MEDIUM',
            'related_entity_type': 'EXPENSE',
            'expires_at': (now + timedelta(days=3)).isoformat(),
        })
    elif features.get('weekend_ratio', 0) > 1.3:
        # Fallback for non-trait weekend detection
        weekend_ratio = features['weekend_ratio']
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

    # Late-night alert: triggered by LATE_NIGHT_TENDENCY trait
    if 'LATE_NIGHT_TENDENCY' in domain_traits:
        late_pct = round(persona.get('spider_axes', {}).get('late_night_activity', 0))
        if late_pct > 0:
            nudges.append({
                'type': 'LATE_NIGHT_ALERT',
                'nudge_type': 'Awareness',
                'trigger': f'LATE_NIGHT_TENDENCY trait ({late_pct}% late-night)',
                'timing': 'reactive',
                'severity': 'light',
                'confidence': round(late_pct / 100, 2),
                'title': NUDGE_TEMPLATES['LATE_NIGHT_ALERT']['title'],
                'message': NUDGE_TEMPLATES['LATE_NIGHT_ALERT']['message'].format(pct=late_pct),
                'priority': 'MEDIUM',
                'related_entity_type': 'EXPENSE',
                'expires_at': (now + timedelta(days=14)).isoformat(),
            })

    # Subscription alerts
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

    # Streak milestones
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

    # Discipline / positive reinforcement
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

    # Persona-specific reinforcement for balanced/cautious personas
    if nudge_style.get('reinforcement') and not any(n['type'] == 'POSITIVE_DISCIPLINE' for n in nudges):
        messages = {
            'BALANCED_SPENDER': "Your balanced spending pattern is working well. Keep diversifying across categories.",
            'CAUTIOUS_SAVER': "Your careful spending habits are paying off. Consider channelling savings into goals.",
        }
        msg = messages.get(persona_type)
        if msg:
            nudges.append({
                'type': 'PERSONA_REINFORCEMENT',
                'nudge_type': 'Positive',
                'trigger': f'Reinforcement nudge for {persona_type}',
                'timing': 'reactive',
                'severity': 'light',
                'confidence': 0.7,
                'title': NUDGE_TEMPLATES['PERSONA_REINFORCEMENT']['title'],
                'message': NUDGE_TEMPLATES['PERSONA_REINFORCEMENT']['message'].format(message=msg),
                'priority': 'LOW',
                'related_entity_type': 'BUDGET',
                'expires_at': (now + timedelta(days=14)).isoformat(),
            })

    # Volatility alert: triggered by HIGH_VOLATILITY trait or spider axis
    if 'HIGH_VOLATILITY' in domain_traits or (spider and spider.get('volatility', 0) > 70):
        vol = spider.get('volatility', 0) if spider else 70
        nudges.append({
            'type': 'CORRECTIVE_VOLATILITY',
            'nudge_type': 'Corrective',
            'trigger': f'HIGH_VOLATILITY trait / spider axis {vol}/100',
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
