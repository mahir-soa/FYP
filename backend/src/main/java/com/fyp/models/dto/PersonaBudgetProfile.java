package com.fyp.models.dto;

import java.util.List;
import java.util.Map;

public class PersonaBudgetProfile {

    private String personaType;
    private double warningThreshold;
    private double pacingThreshold;
    private String reallocationStyle;
    private String guidanceStyle;
    private String guidanceMessage;
    private List<Map<String, Object>> steps;

    public PersonaBudgetProfile() {}

    public PersonaBudgetProfile(String personaType, double warningThreshold, double pacingThreshold,
                                 String reallocationStyle, String guidanceStyle, String guidanceMessage,
                                 List<Map<String, Object>> steps) {
        this.personaType = personaType;
        this.warningThreshold = warningThreshold;
        this.pacingThreshold = pacingThreshold;
        this.reallocationStyle = reallocationStyle;
        this.guidanceStyle = guidanceStyle;
        this.guidanceMessage = guidanceMessage;
        this.steps = steps;
    }

    public String getPersonaType() { return personaType; }
    public void setPersonaType(String personaType) { this.personaType = personaType; }
    public double getWarningThreshold() { return warningThreshold; }
    public void setWarningThreshold(double warningThreshold) { this.warningThreshold = warningThreshold; }
    public double getPacingThreshold() { return pacingThreshold; }
    public void setPacingThreshold(double pacingThreshold) { this.pacingThreshold = pacingThreshold; }
    public String getReallocationStyle() { return reallocationStyle; }
    public void setReallocationStyle(String reallocationStyle) { this.reallocationStyle = reallocationStyle; }
    public String getGuidanceStyle() { return guidanceStyle; }
    public void setGuidanceStyle(String guidanceStyle) { this.guidanceStyle = guidanceStyle; }
    public String getGuidanceMessage() { return guidanceMessage; }
    public void setGuidanceMessage(String guidanceMessage) { this.guidanceMessage = guidanceMessage; }
    public List<Map<String, Object>> getSteps() { return steps; }
    public void setSteps(List<Map<String, Object>> steps) { this.steps = steps; }

    public Map<String, Object> toMap() {
        return Map.of(
            "personaType", personaType != null ? personaType : "NEUTRAL",
            "warningThreshold", warningThreshold,
            "pacingThreshold", pacingThreshold,
            "reallocationStyle", reallocationStyle != null ? reallocationStyle : "STANDARD",
            "guidanceStyle", guidanceStyle != null ? guidanceStyle : "NEUTRAL",
            "guidanceMessage", guidanceMessage != null ? guidanceMessage : "",
            "steps", steps != null ? steps : List.of()
        );
    }
}
