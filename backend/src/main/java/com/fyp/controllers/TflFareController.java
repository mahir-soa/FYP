package com.fyp.controllers;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fyp.services.TflFareService;

@RestController
@RequestMapping("/api/tfl")
@CrossOrigin(origins = "http://localhost:5173")
public class TflFareController {

    private final TflFareService fareService;

    public TflFareController(TflFareService fareService) {
        this.fareService = fareService;
    }

    @GetMapping("/fare")
    public ResponseEntity<Map<String, Object>> calculateFare(
            @RequestParam String type,
            @RequestParam(required = false) Integer fromZone,
            @RequestParam(required = false) Integer toZone,
            @RequestParam(required = false, defaultValue = "false") Boolean isPeak) {

        Double fare = fareService.calculateFare(type, fromZone, toZone, isPeak);

        if (fare == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Could not calculate fare",
                "message", "Missing zone information for train journey"
            ));
        }

        return ResponseEntity.ok(Map.of(
            "transportType", type,
            "fromZone", fromZone != null ? fromZone : "N/A",
            "toZone", toZone != null ? toZone : "N/A",
            "isPeak", isPeak,
            "fare", fare
        ));
    }
}
