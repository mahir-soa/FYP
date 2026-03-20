package com.fyp.models.dto;

import java.time.LocalDate;
import java.util.List;

public class PlanUpdateDTO {

    private String title;
    private String description;
    private String family;
    private String type;
    private String category;
    private Double targetAmount;
    private Double currentAmount;
    private Double monthlyContribution;
    private String priorityAdjustments;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate targetDate;
    private Boolean isFlexible;
    private Boolean isActive;

    // New fields
    private String cadence;
    private String termination;
    private List<String> priorityCategories;
    private String direction;
    private String intensity;
    private Double priorityAmount;
    private String reasonNote;
    private Integer durationMonths;

    public PlanUpdateDTO() {}

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
    public Double getTargetAmount() { return targetAmount; }
    public void setTargetAmount(Double targetAmount) { this.targetAmount = targetAmount; }
    public Double getCurrentAmount() { return currentAmount; }
    public void setCurrentAmount(Double currentAmount) { this.currentAmount = currentAmount; }
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
    public Boolean getIsFlexible() { return isFlexible; }
    public void setIsFlexible(Boolean isFlexible) { this.isFlexible = isFlexible; }
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    public String getCadence() { return cadence; }
    public void setCadence(String cadence) { this.cadence = cadence; }
    public String getTermination() { return termination; }
    public void setTermination(String termination) { this.termination = termination; }
    public List<String> getPriorityCategories() { return priorityCategories; }
    public void setPriorityCategories(List<String> priorityCategories) { this.priorityCategories = priorityCategories; }
    public String getDirection() { return direction; }
    public void setDirection(String direction) { this.direction = direction; }
    public String getIntensity() { return intensity; }
    public void setIntensity(String intensity) { this.intensity = intensity; }
    public Double getPriorityAmount() { return priorityAmount; }
    public void setPriorityAmount(Double priorityAmount) { this.priorityAmount = priorityAmount; }
    public String getReasonNote() { return reasonNote; }
    public void setReasonNote(String reasonNote) { this.reasonNote = reasonNote; }
    public Integer getDurationMonths() { return durationMonths; }
    public void setDurationMonths(Integer durationMonths) { this.durationMonths = durationMonths; }
}
