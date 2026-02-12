import pandas as pd
import numpy as np
import json

np.random.seed(42)


def export_expenses(txns):
    df = txns[['user_id', 'amount', 'category', 'mood', 'date', 'description']].copy()
    df.to_csv('ml/data/generated/expenses.csv', index=False)
    print(f"expenses.csv: {len(df)} rows")


def export_incomes(incomes):
    df = incomes[['user_id', 'amount', 'source', 'frequency', 'date']].copy()
    df.to_csv('ml/data/generated/incomes.csv', index=False)
    print(f"incomes.csv: {len(df)} rows")


def export_bills(bills):
    df = bills[['user_id', 'amount', 'category', 'frequency', 'due_day', 'is_paid', 'name']].copy()
    df.rename(columns={'name': 'description'}, inplace=True)
    df.to_csv('ml/data/generated/bills.csv', index=False)
    print(f"bills.csv: {len(df)} rows")


def export_subscriptions(subs):
    df = subs[['user_id', 'name', 'cost', 'billing_cycle', 'last_used_date', 'status', 'provider_key', 'category']].copy()
    df.rename(columns={'name': 'provider', 'billing_cycle': 'frequency', 'status': 'active'}, inplace=True)
    df['active'] = df['active'].map({'ACTIVE': True, 'PAUSED': False, 'CANCELLED': False})
    df.to_csv('ml/data/generated/subscriptions.csv', index=False)
    print(f"subscriptions.csv: {len(df)} rows")


def export_budgets(budgets):
    rows = []
    for _, row in budgets.iterrows():
        limits = json.loads(row['category_limits'])
        for category, suggested in limits.items():
            rows.append({
                'user_id': row['user_id'],
                'category': category,
                'suggested_amount': suggested,
                'actual_amount': 0,
                'month': row['month'],
            })
    df = pd.DataFrame(rows)
    df.to_csv('ml/data/generated/budgets.csv', index=False)
    print(f"budgets.csv: {len(df)} rows")


def export_user_profiles(profiles):
    df = profiles[['user_id', 'monthly_income', 'savings', 'debt_to_income_ratio', 'credit_score']].copy()
    df.to_csv('ml/data/generated/user_profiles.csv', index=False)
    print(f"user_profiles.csv: {len(df)} rows")


def main():
    txns = pd.read_csv('ml/data/generated/synthetic_users.csv')
    incomes = pd.read_csv('ml/data/generated/incomes.csv')
    bills = pd.read_csv('ml/data/generated/bills.csv')
    subs = pd.read_csv('ml/data/generated/subscriptions.csv')
    budgets = pd.read_csv('ml/data/generated/budgets.csv')
    profiles = pd.read_csv('ml/data/generated/user_profiles.csv')

    print("Exporting CSVs matching PostgreSQL schema:\n")
    export_expenses(txns)
    export_incomes(incomes)
    export_bills(bills)
    export_subscriptions(subs)
    export_budgets(budgets)
    export_user_profiles(profiles)
    print("\nAll CSVs saved to ml/data/generated/")


if __name__ == '__main__':
    main()
