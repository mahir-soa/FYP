package com.fyp.controllers;

import com.fyp.services.MlService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;

import java.util.Map;

@RestController
@RequestMapping("/api/ml")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class MlController {

    private final MlService mlService;

    public MlController(MlService mlService) {
        this.mlService = mlService;
    }

    @PostMapping("/analyse/{userId}")
    public ResponseEntity<?> analyseUser(@PathVariable Long userId) {
        try {
            Map<String, Object> result = mlService.analyseUser(userId);
            return ResponseEntity.ok(result);
        } catch (HttpStatusCodeException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getResponseBodyAsString());
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "ML service unavailable: " + e.getMessage()));
        }
    }

    @GetMapping("/persona/{userId}")
    public ResponseEntity<?> getPersona(@PathVariable Long userId) {
        try {
            Map<String, Object> result = mlService.getPersona(userId);
            return ResponseEntity.ok(result);
        } catch (HttpStatusCodeException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getResponseBodyAsString());
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "ML service unavailable: " + e.getMessage()));
        }
    }

    @GetMapping("/risk/{userId}")
    public ResponseEntity<?> getRisk(@PathVariable Long userId) {
        try {
            Map<String, Object> result = mlService.getRisk(userId);
            return ResponseEntity.ok(result);
        } catch (HttpStatusCodeException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getResponseBodyAsString());
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "ML service unavailable: " + e.getMessage()));
        }
    }

    @GetMapping("/nudges/{userId}")
    public ResponseEntity<?> getNudges(@PathVariable Long userId) {
        try {
            Map<String, Object> result = mlService.getNudges(userId);
            return ResponseEntity.ok(result);
        } catch (HttpStatusCodeException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getResponseBodyAsString());
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "ML service unavailable: " + e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        boolean healthy = mlService.isHealthy();
        if (healthy) {
            return ResponseEntity.ok(Map.of("status", "ok", "ml_service", "connected"));
        }
        return ResponseEntity.ok(Map.of("status", "degraded", "ml_service", "unavailable"));
    }
}
