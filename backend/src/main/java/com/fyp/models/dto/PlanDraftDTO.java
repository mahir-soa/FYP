package com.fyp.models.dto;

import java.time.LocalDate;
import java.util.List;

public class PlanDraftDTO {

    // Common fields
    private String family;
    private Double confidence;
    private String title;
    private String cadence;
    private String termination;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate targetDate;
    private Integer durationMonths;
    private String reasonNote;
    private List<String> missingFields;
    private Boolean clarificationNeeded;
    private List<String> clarificationQuestions;
    private String parserNotes;

    // Outcome-only fields
    private String outcomeCategory;
    private Double targetAmount;
    private Double monthlyContribution;

    // Priority-only fields
    private List<String> priorityCategories;
    private String direction;
    private String intensity;
    private Double priorityAmount;

    public PlanDraftDTO() {}

    public String getFamily() { return family; }
    public void setFamily(String family) { this.family = family; }
    public Double getConfidence() { return confidence; }
    public void setConfidence(Double confidence) { this.confidence = confidence; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getCadence() { return cadence; }
    public void setCadence(String cadence) { this.cadence = cadence; }
    public String getTermination() { return termination; }
    public void setTermination(String termination) { this.termination = termination; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public LocalDate getTargetDate() { return targetDate; }
    public void setTargetDate(LocalDate targetDate) { this.targetDate = targetDate; }
    public Integer getDurationMonths() { return durationMonths; }
    public void setDurationMonths(Integer durationMonths) { this.durationMonths = durationMonths; }
    public String getReasonNote() { return reasonNote; }
    public void setReasonNote(String reasonNote) { this.reasonNote = reasonNote; }
    public List<String> getMissingFields() { return missingFields; }
    public void setMissingFields(List<String> missingFields) { this.missingFields = missingFields; }
    public Boolean getClarificationNeeded() { return clarificationNeeded; }
    public void setClarificationNeeded(Boolean clarificationNeeded) { this.clarificationNeeded = clarificationNeeded; }
    public List<String> getClarificationQuestions() { return clarificationQuestions; }
    public void setClarificationQuestions(List<String> clarificationQuestions) { this.clarificationQuestions = clarificationQuestions; }
    public String getParserNotes() { return parserNotes; }
    public void setParserNotes(String parserNotes) { this.parserNotes = parserNotes; }
    public String getOutcomeCategory() { return outcomeCategory; }
    public void setOutcomeCategory(String outcomeCategory) { this.outcomeCategory = outcomeCategory; }
    public Double getTargetAmount() { return targetAmount; }
    public void setTargetAmount(Double targetAmount) { this.targetAmount = targetAmount; }
    public Double getMonthlyContribution() { return monthlyContribution; }
    public void setMonthlyContribution(Double monthlyContribution) { this.monthlyContribution = monthlyContribution; }
    public List<String> getPriorityCategories() { return priorityCategories; }
    public void setPriorityCategories(List<String> priorityCategories) { this.priorityCategories = priorityCategories; }
    public String getDirection() { return direction; }
    public void setDirection(String direction) { this.direction = direction; }
    public String getIntensity() { return intensity; }
    public void setIntensity(String intensity) { this.intensity = intensity; }
    public Double getPriorityAmount() { return priorityAmount; }
    public void setPriorityAmount(Double priorityAmount) { this.priorityAmount = priorityAmount; }
}
