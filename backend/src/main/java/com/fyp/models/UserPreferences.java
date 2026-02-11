package com.fyp.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_preferences")
public class UserPreferences {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", unique = true, nullable = false)
    private Long userId;

    // Onboarding status
    @Column(name = "onboarding_completed")
    private boolean onboardingCompleted = false;

    @Column(name = "onboarding_completed_at")
    private LocalDateTime onboardingCompletedAt;

    // Budget preferences
    @Column(name = "budget_style")
    private String budgetStyle; // LIGHT, NORMAL, STRICT

    @Column(name = "priority_categories", length = 1000)
    private String priorityCategories; // JSON array: ["Food", "Transport"]

    @Column(name = "cut_categories", length = 1000)
    private String cutCategories; // JSON array: ["Entertainment", "Shopping"]

    // Income preferences
    @Column(name = "primary_pay_frequency")
    private String primaryPayFrequency; // WEEKLY, BIWEEKLY, MONTHLY

    @Column(name = "pay_day")
    private Integer payDay; // Day of month (1-31) or day of week (1-7)

    // Nudge/notification settings
    @Column(name = "nudge_frequency")
    private String nudgeFrequency; // DAILY, WEEKLY, MINIMAL

    @Column(name = "nudge_budget_warnings")
    private boolean nudgeBudgetWarnings = true;

    @Column(name = "nudge_upcoming_payments")
    private boolean nudgeUpcomingPayments = true;

    @Column(name = "nudge_unused_subscriptions")
    private boolean nudgeUnusedSubscriptions = true;

    @Column(name = "nudge_goal_progress")
    private boolean nudgeGoalProgress = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public UserPreferences() {
    }

    public UserPreferences(Long userId) {
        this.userId = userId;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public boolean isOnboardingCompleted() {
        return onboardingCompleted;
    }

    public void setOnboardingCompleted(boolean onboardingCompleted) {
        this.onboardingCompleted = onboardingCompleted;
    }

    public LocalDateTime getOnboardingCompletedAt() {
        return onboardingCompletedAt;
    }

    public void setOnboardingCompletedAt(LocalDateTime onboardingCompletedAt) {
        this.onboardingCompletedAt = onboardingCompletedAt;
    }

    public String getBudgetStyle() {
        return budgetStyle;
    }

    public void setBudgetStyle(String budgetStyle) {
        this.budgetStyle = budgetStyle;
    }

    public String getPriorityCategories() {
        return priorityCategories;
    }

    public void setPriorityCategories(String priorityCategories) {
        this.priorityCategories = priorityCategories;
    }

    public String getCutCategories() {
        return cutCategories;
    }

    public void setCutCategories(String cutCategories) {
        this.cutCategories = cutCategories;
    }

    public String getPrimaryPayFrequency() {
        return primaryPayFrequency;
    }

    public void setPrimaryPayFrequency(String primaryPayFrequency) {
        this.primaryPayFrequency = primaryPayFrequency;
    }

    public Integer getPayDay() {
        return payDay;
    }

    public void setPayDay(Integer payDay) {
        this.payDay = payDay;
    }

    public String getNudgeFrequency() {
        return nudgeFrequency;
    }

    public void setNudgeFrequency(String nudgeFrequency) {
        this.nudgeFrequency = nudgeFrequency;
    }

    public boolean isNudgeBudgetWarnings() {
        return nudgeBudgetWarnings;
    }

    public void setNudgeBudgetWarnings(boolean nudgeBudgetWarnings) {
        this.nudgeBudgetWarnings = nudgeBudgetWarnings;
    }

    public boolean isNudgeUpcomingPayments() {
        return nudgeUpcomingPayments;
    }

    public void setNudgeUpcomingPayments(boolean nudgeUpcomingPayments) {
        this.nudgeUpcomingPayments = nudgeUpcomingPayments;
    }

    public boolean isNudgeUnusedSubscriptions() {
        return nudgeUnusedSubscriptions;
    }

    public void setNudgeUnusedSubscriptions(boolean nudgeUnusedSubscriptions) {
        this.nudgeUnusedSubscriptions = nudgeUnusedSubscriptions;
    }

    public boolean isNudgeGoalProgress() {
        return nudgeGoalProgress;
    }

    public void setNudgeGoalProgress(boolean nudgeGoalProgress) {
        this.nudgeGoalProgress = nudgeGoalProgress;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
