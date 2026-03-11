package com.fyp.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "budgets")
public class Budget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    private String month; // YYYY-MM

    @Column(name = "total_budget")
    private double totalBudget;

    @Column(name = "category_limits", length = 2000)
    private String categoryLimits; // JSON string

    @Column(name = "safe_to_spend")
    private double safeToSpend;

    @Column(name = "buffer_amount")
    private double bufferAmount;

    @Column(name = "buffer_remaining")
    private double bufferRemaining;

    @Column(name = "goal_override_action")
    private String goalOverrideAction;

    @Column(name = "category_meta", length = 4000)
    private String categoryMeta;

    public Budget() {}

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getMonth() { return month; }
    public void setMonth(String month) { this.month = month; }
    public double getTotalBudget() { return totalBudget; }
    public void setTotalBudget(double totalBudget) { this.totalBudget = totalBudget; }
    public String getCategoryLimits() { return categoryLimits; }
    public void setCategoryLimits(String categoryLimits) { this.categoryLimits = categoryLimits; }
    public double getSafeToSpend() { return safeToSpend; }
    public void setSafeToSpend(double safeToSpend) { this.safeToSpend = safeToSpend; }
    public double getBufferAmount() { return bufferAmount; }
    public void setBufferAmount(double bufferAmount) { this.bufferAmount = bufferAmount; }
    public double getBufferRemaining() { return bufferRemaining; }
    public void setBufferRemaining(double bufferRemaining) { this.bufferRemaining = bufferRemaining; }
    public String getGoalOverrideAction() { return goalOverrideAction; }
    public void setGoalOverrideAction(String goalOverrideAction) { this.goalOverrideAction = goalOverrideAction; }
    public String getCategoryMeta() { return categoryMeta; }
    public void setCategoryMeta(String categoryMeta) { this.categoryMeta = categoryMeta; }
}
