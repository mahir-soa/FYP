package com.fyp.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_persona")
public class UserPersona {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", unique = true, nullable = false)
    private Long userId;

    @Column(name = "persona_type", nullable = false)
    private String personaType;

    @Column(name = "persona_primary")
    private String personaPrimary;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "confidence_level")
    private String confidenceLevel;

    @Column(name = "confidence_data", length = 2000)
    private String confidenceData;

    @Column(name = "spider_axes", length = 1000)
    private String spiderAxes;

    @Column(name = "discipline_data", length = 2000)
    private String disciplineData;

    @Column(name = "emotional_spender_flag")
    private Boolean emotionalSpenderFlag = false;

    @Column(name = "feature_snapshot", columnDefinition = "TEXT")
    private String featureSnapshot;

    @Column(name = "calculated_at")
    private LocalDateTime calculatedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public UserPersona() {
    }

    public UserPersona(Long userId, String personaType) {
        this.userId = userId;
        this.personaType = personaType;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (calculatedAt == null) {
            calculatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getPersonaType() { return personaType; }
    public void setPersonaType(String personaType) { this.personaType = personaType; }
    public String getPersonaPrimary() { return personaPrimary; }
    public void setPersonaPrimary(String personaPrimary) { this.personaPrimary = personaPrimary; }
    public Double getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(Double confidenceScore) { this.confidenceScore = confidenceScore; }
    public String getConfidenceLevel() { return confidenceLevel; }
    public void setConfidenceLevel(String confidenceLevel) { this.confidenceLevel = confidenceLevel; }
    public String getConfidenceData() { return confidenceData; }
    public void setConfidenceData(String confidenceData) { this.confidenceData = confidenceData; }
    public String getSpiderAxes() { return spiderAxes; }
    public void setSpiderAxes(String spiderAxes) { this.spiderAxes = spiderAxes; }
    public String getDisciplineData() { return disciplineData; }
    public void setDisciplineData(String disciplineData) { this.disciplineData = disciplineData; }
    public Boolean getEmotionalSpenderFlag() { return emotionalSpenderFlag; }
    public void setEmotionalSpenderFlag(Boolean emotionalSpenderFlag) { this.emotionalSpenderFlag = emotionalSpenderFlag; }
    public String getFeatureSnapshot() { return featureSnapshot; }
    public void setFeatureSnapshot(String featureSnapshot) { this.featureSnapshot = featureSnapshot; }
    public LocalDateTime getCalculatedAt() { return calculatedAt; }
    public void setCalculatedAt(LocalDateTime calculatedAt) { this.calculatedAt = calculatedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
