package com.fyp.models.dto;

import java.time.LocalDate;

public class PlanCreateDTO {

    private String title;
    private String description;
    private String family;
    private String type;
    private String category;
    private double targetAmount;
    private double currentAmount;
    private Double monthlyContribution;
    private String priorityAdjustments;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate targetDate;
    private boolean isFlexible = true;

    public PlanCreateDTO() {}

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getFamily() { return family; }
    public void setFamily(String family) { this.family = family; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public double getTargetAmount() { return targetAmount; }
    public void setTargetAmount(double targetAmount) { this.targetAmount = targetAmount; }
    public double getCurrentAmount() { return currentAmount; }
    public void setCurrentAmount(double currentAmount) { this.currentAmount = currentAmount; }
    public Double getMonthlyContribution() { return monthlyContribution; }
    public void setMonthlyContribution(Double monthlyContribution) { this.monthlyContribution = monthlyContribution; }
    public String getPriorityAdjustments() { return priorityAdjustments; }
    public void setPriorityAdjustments(String priorityAdjustments) { this.priorityAdjustments = priorityAdjustments; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public LocalDate getTargetDate() { return targetDate; }
    public void setTargetDate(LocalDate targetDate) { this.targetDate = targetDate; }
    public boolean getIsFlexible() { return isFlexible; }
    public void setIsFlexible(boolean isFlexible) { this.isFlexible = isFlexible; }
}
