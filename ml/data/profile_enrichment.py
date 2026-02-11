import pandas as pd
import numpy as np

np.random.seed(42)

PERSONA_PROFILE_FILTERS = {
    'IMPULSIVE_SPENDER': {
        'expenses_min_ratio': 0.7,   # spends 70%+ of income
        'credit_max': 650,
    },
    'CAUTIOUS_SAVER': {
        'expenses_max_ratio': 0.5,   # spends under 50% of income
        'credit_min': 650,
        'savings_ratio_min': 5.0,
    },
    'WEEKEND_SPLURGER': {
        'expenses_min_ratio': 0.5,
        'expenses_max_ratio': 0.8,
    },
    'SUBSCRIPTION_HOARDER': {
        'expenses_min_ratio': 0.55,
        'expenses_max_ratio': 0.85,
    },
    'BALANCED_BUDGETER': {
        'expenses_min_ratio': 0.4,
        'expenses_max_ratio': 0.65,
        'credit_min': 550,
    },
}


def filter_candidates(profiles, filters):
    mask = pd.Series(True, index=profiles.index)

    ratio = profiles['monthly_expenses_usd'] / profiles['monthly_income_usd']

    if 'expenses_min_ratio' in filters:
        mask &= ratio >= filters['expenses_min_ratio']
    if 'expenses_max_ratio' in filters:
        mask &= ratio <= filters['expenses_max_ratio']
    if 'credit_min' in filters:
        mask &= profiles['credit_score'] >= filters['credit_min']
    if 'credit_max' in filters:
        mask &= profiles['credit_score'] <= filters['credit_max']
    if 'savings_ratio_min' in filters:
        mask &= profiles['savings_to_income_ratio'] >= filters['savings_ratio_min']

    candidates = profiles[mask]
    if len(candidates) < 10:
        return profiles.sample(10)
    return candidates


def main():
    profiles = pd.read_csv('ml/data/synthetic_personal_finance_dataset.csv')
    users_df = pd.read_csv('ml/data/generated/synthetic_users.csv')

    user_personas = users_df.groupby('user_id')['persona'].first().reset_index()
    print(f"Assigning profiles to {len(user_personas)} users\n")

    used_indices = set()
    assignments = []

    for persona_key, filters in PERSONA_PROFILE_FILTERS.items():
        persona_users = user_personas[user_personas['persona'] == persona_key]['user_id'].tolist()
        candidates = filter_candidates(profiles, filters)
        candidates = candidates[~candidates.index.isin(used_indices)]

        if len(candidates) < len(persona_users):
            candidates = profiles[~profiles.index.isin(used_indices)]

        sampled = candidates.sample(n=len(persona_users))
        used_indices.update(sampled.index.tolist())

        for uid, (_, profile) in zip(persona_users, sampled.iterrows()):
            assignments.append({
                'user_id': uid,
                'monthly_income': round(profile['monthly_income_usd'], 2),
                'monthly_expenses': round(profile['monthly_expenses_usd'], 2),
                'savings': round(profile['savings_usd'], 2),
                'debt_to_income_ratio': round(profile['debt_to_income_ratio'], 2),
                'credit_score': int(profile['credit_score']),
                'savings_to_income_ratio': round(profile['savings_to_income_ratio'], 2),
                'age': int(profile['age']),
                'employment_status': profile['employment_status'],
            })

        print(f"  {persona_key}: assigned {len(persona_users)} profiles "
              f"(avg income: £{np.mean([a['monthly_income'] for a in assignments[-len(persona_users):]]):.0f})")

    profiles_df = pd.DataFrame(assignments).sort_values('user_id').reset_index(drop=True)
    profiles_df.to_csv('ml/data/generated/user_profiles.csv', index=False)
    print(f"\nSaved {len(profiles_df)} user profiles to ml/data/generated/user_profiles.csv")


if __name__ == '__main__':
    main()
