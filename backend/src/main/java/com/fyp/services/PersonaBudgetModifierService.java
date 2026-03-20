package com.fyp.services;

import com.fyp.models.UserPersona;
import com.fyp.models.dto.PersonaBudgetProfile;
import com.fyp.repos.UserPersonaRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class PersonaBudgetModifierService {

    // Neutral defaults (no persona or unrecognised persona)
    private static final double NEUTRAL_WARNING = 0.80;
    private static final double NEUTRAL_PACING = 0.15;
    private static final String NEUTRAL_REALLOCATION = "STANDARD";
    private static final String NEUTRAL_GUIDANCE_STYLE = "NEUTRAL";
    private static final String NEUTRAL_GUIDANCE_MSG =
            "Your budget is using standard monitoring settings.";

    private final UserPersonaRepository userPersonaRepository;

    public PersonaBudgetModifierService(UserPersonaRepository userPersonaRepository) {
        this.userPersonaRepository = userPersonaRepository;
    }

    /**
     * Apply Layer 5 persona modifiers.
     * This does NOT change any Layer 1-4 values.
     * It returns monitoring / interpretation settings based on persona.
     */
    public PersonaBudgetProfile applyPersonaModifiers(Long userId) {
        Optional<UserPersona> personaOpt = userPersonaRepository.findByUserId(userId);

        if (personaOpt.isEmpty()) {
            return buildNeutralProfile();
        }

        UserPersona persona = personaOpt.get();
        String personaType = persona.getPersonaType();

        if (personaType == null || "INSUFFICIENT_DATA".equals(personaType)) {
            return buildNeutralProfile();
        }

        return switch (personaType) {
            case "ERRATIC_SPENDER" -> buildErraticSpenderProfile();
            case "BIG_SPENDER" -> buildBigSpenderProfile();
            case "BALANCED_SPENDER" -> buildBalancedSpenderProfile();
            default -> buildNeutralProfile();
        };
    }

    // ERRATIC_SPENDER

    private PersonaBudgetProfile buildErraticSpenderProfile() {
        double warningThreshold = 0.70;
        double pacingThreshold = 0.10;
        String reallocationStyle = "DISCRETIONARY_FIRST";
        String guidanceStyle = "CORRECTIVE";
        String guidanceMessage = "Your budget is using earlier warnings and tighter pacing "
                + "because your spending pattern is more variable.";

        List<Map<String, Object>> steps = new ArrayList<>();

        steps.add(step("warningThreshold", "modifier",
                NEUTRAL_WARNING, warningThreshold - NEUTRAL_WARNING, warningThreshold,
                "Erratic Spender uses earlier warnings because spending is more variable."));

        steps.add(step("pacingThreshold", "modifier",
                NEUTRAL_PACING, pacingThreshold - NEUTRAL_PACING, pacingThreshold,
                "Tighter pacing — flagged if 10% ahead of expected monthly pace."));

        steps.add(step("reallocationStyle", "modifier",
                0, 0, 0,
                "Discretionary categories (Leisure, Other) squeezed first under pressure."));

        steps.add(step("guidanceMessage", "modifier",
                0, 0, 0,
                guidanceMessage));

        return new PersonaBudgetProfile("ERRATIC_SPENDER", warningThreshold, pacingThreshold,
                reallocationStyle, guidanceStyle, guidanceMessage, steps);
    }

    // BIG_SPENDER

    private PersonaBudgetProfile buildBigSpenderProfile() {
        double warningThreshold = 0.75;
        double pacingThreshold = 0.15;
        String reallocationStyle = "NON_ESSENTIALS_FIRST";
        String guidanceStyle = "CAUTIONARY";
        String guidanceMessage = "Your budget is monitoring overall spending more closely "
                + "to help keep total monthly spending under control.";

        List<Map<String, Object>> steps = new ArrayList<>();

        steps.add(step("warningThreshold", "modifier",
                NEUTRAL_WARNING, warningThreshold - NEUTRAL_WARNING, warningThreshold,
                "Big Spender uses moderately early warnings to catch overspending sooner."));

        steps.add(step("pacingThreshold", "modifier",
                NEUTRAL_PACING, pacingThreshold - NEUTRAL_PACING, pacingThreshold,
                "Standard pacing sensitivity — flagged if 15% ahead of expected monthly pace."));

        steps.add(step("reallocationStyle", "modifier",
                0, 0, 0,
                "Non-essential categories reduced first; essentials preserved under pressure."));

        steps.add(step("guidanceMessage", "modifier",
                0, 0, 0,
                guidanceMessage));

        return new PersonaBudgetProfile("BIG_SPENDER", warningThreshold, pacingThreshold,
                reallocationStyle, guidanceStyle, guidanceMessage, steps);
    }

    // BALANCED_SPENDER

    private PersonaBudgetProfile buildBalancedSpenderProfile() {
        double warningThreshold = 0.85;
        double pacingThreshold = 0.20;
        String reallocationStyle = "EVEN_REBALANCE";
        String guidanceStyle = "POSITIVE";
        String guidanceMessage = "Your budget is using steadier pacing and lighter intervention "
                + "because your spending pattern is more balanced.";

        List<Map<String, Object>> steps = new ArrayList<>();

        steps.add(step("warningThreshold", "modifier",
                NEUTRAL_WARNING, warningThreshold - NEUTRAL_WARNING, warningThreshold,
                "Balanced Spender gets later warnings — spending is consistent enough to allow more room."));

        steps.add(step("pacingThreshold", "modifier",
                NEUTRAL_PACING, pacingThreshold - NEUTRAL_PACING, pacingThreshold,
                "Relaxed pacing — only flagged if 20% ahead of expected monthly pace."));

        steps.add(step("reallocationStyle", "modifier",
                0, 0, 0,
                "Reductions spread evenly across all categories rather than targeting specific ones."));

        steps.add(step("guidanceMessage", "modifier",
                0, 0, 0,
                guidanceMessage));

        return new PersonaBudgetProfile("BALANCED_SPENDER", warningThreshold, pacingThreshold,
                reallocationStyle, guidanceStyle, guidanceMessage, steps);
    }

    // NEUTRAL fallback

    private PersonaBudgetProfile buildNeutralProfile() {
        List<Map<String, Object>> steps = new ArrayList<>();

        steps.add(step("none", "modifier", 0, 0, 0,
                "No recognised persona — using standard monitoring settings."));

        return new PersonaBudgetProfile("NEUTRAL", NEUTRAL_WARNING, NEUTRAL_PACING,
                NEUTRAL_REALLOCATION, NEUTRAL_GUIDANCE_STYLE, NEUTRAL_GUIDANCE_MSG, steps);
    }

    // Step builder

    private Map<String, Object> step(String field, String action,
                                      double input, double adjustment, double result, String reason) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("layer", "PERSONA");
        s.put("field", field);
        s.put("action", action);
        s.put("input", round2(input));
        s.put("adjustment", round2(adjustment));
        s.put("result", round2(result));
        s.put("reason", reason);
        return s;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
