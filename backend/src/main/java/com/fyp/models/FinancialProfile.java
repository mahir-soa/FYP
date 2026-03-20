package com.fyp.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "financial_profiles")
public class FinancialProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", unique = true)
    private Long userId;

    @Column(name = "current_balance")
    private double currentBalance;

    @Column(name = "usable_balance_percent")
    private double usableBalancePercent = 0.10;

    @Column(name = "safety_reserve")
    private double safetyReserve;

    @Column(name = "debt_minimum_monthly")
    private double debtMinimumMonthly;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public FinancialProfile() {}

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public double getCurrentBalance() { return currentBalance; }
    public void setCurrentBalance(double currentBalance) { this.currentBalance = currentBalance; }
    public double getUsableBalancePercent() { return usableBalancePercent; }
    public void setUsableBalancePercent(double usableBalancePercent) { this.usableBalancePercent = usableBalancePercent; }
    public double getSafetyReserve() { return safetyReserve; }
    public void setSafetyReserve(double safetyReserve) { this.safetyReserve = safetyReserve; }
    public double getDebtMinimumMonthly() { return debtMinimumMonthly; }
    public void setDebtMinimumMonthly(double debtMinimumMonthly) { this.debtMinimumMonthly = debtMinimumMonthly; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public double getUsableCash() {
        return Math.max(0, (currentBalance - safetyReserve) * usableBalancePercent);
    }
}
