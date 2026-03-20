package com.fyp.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Entity
@Table(name = "plans")
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    private String title;

    @Column(length = 500)
    private String description;

    // OUTCOME_PLAN or PRIORITY_PLAN
    private String family;

    // Legacy: ONE_OFF, CONTINUOUS, FIXED_PERIOD, UNTIL_TARGET (deprecated — use cadence+termination)
    private String type;

    // Subtype for OUTCOME plans: SAVINGS, DEBT, PURCHASE, EMERGENCY
    private String category;

    @Column(name = "target_amount")
    private double targetAmount;

    @Column(name = "current_amount")
    private double currentAmount;

    @Column(name = "monthly_contribution")
    private Double monthlyContribution;

    // Legacy: JSON array for mixed-direction priority plans (deprecated — use direction/intensity/priorityCategories)
    @Column(name = "priority_adjustments", length = 2000)
    private String priorityAdjustments;

    // New: ONE_TIME or MONTHLY_RECURRING
    private String cadence;

    // New: ON_DATE, AFTER_PERIOD, UNTIL_TARGET, OPEN_ENDED
    private String termination;

    // New: JSON array of spending categories e.g. ["Food","Leisure"]
    @Column(name = "priority_categories", length = 500)
    private String priorityCategories;

    // New: INCREASE, REDUCE, PROTECT
    private String direction;

    // New: LOW, MEDIUM, HIGH
    private String intensity;

    // New: user's reason for the plan
    @Column(name = "reason_note", length = 500)
    private String reasonNote;

    // New: optional target amount for priority plans (e.g. "spend £200 more on food")
    @Column(name = "priority_amount")
    private Double priorityAmount;

    // New: number of months for AFTER_PERIOD termination
    @Column(name = "duration_months")
    private Integer durationMonths;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "target_deadline")
    private LocalDate targetDate;

    @Column(name = "is_active")
    private boolean isActive = true;

    @Column(name = "is_flexible")
    private boolean isFlexible = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public Plan() {}

    // Alias getter: outcomeCategory maps to existing category field
    public String getOutcomeCategory() { return category; }

    // Helper: parse priorityCategories JSON into List<String>
    public List<String> getPriorityCategoriesList() {
        if (priorityCategories == null || priorityCategories.isEmpty()) {
            return new ArrayList<>();
        }
        try {
            return OBJECT_MAPPER.readValue(priorityCategories, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
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
    public String getCadence() { return cadence; }
    public void setCadence(String cadence) { this.cadence = cadence; }
    public String getTermination() { return termination; }
    public void setTermination(String termination) { this.termination = termination; }
    public String getPriorityCategories() { return priorityCategories; }
    public void setPriorityCategories(String priorityCategories) { this.priorityCategories = priorityCategories; }
    public String getDirection() { return direction; }
    public void setDirection(String direction) { this.direction = direction; }
    public String getIntensity() { return intensity; }
    public void setIntensity(String intensity) { this.intensity = intensity; }
    public String getReasonNote() { return reasonNote; }
    public void setReasonNote(String reasonNote) { this.reasonNote = reasonNote; }
    public Double getPriorityAmount() { return priorityAmount; }
    public void setPriorityAmount(Double priorityAmount) { this.priorityAmount = priorityAmount; }
    public Integer getDurationMonths() { return durationMonths; }
    public void setDurationMonths(Integer durationMonths) { this.durationMonths = durationMonths; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public LocalDate getTargetDate() { return targetDate; }
    public void setTargetDate(LocalDate targetDate) { this.targetDate = targetDate; }
    public boolean getIsActive() { return isActive; }
    public void setIsActive(boolean isActive) { this.isActive = isActive; }
    public boolean getIsFlexible() { return isFlexible; }
    public void setIsFlexible(boolean isFlexible) { this.isFlexible = isFlexible; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
