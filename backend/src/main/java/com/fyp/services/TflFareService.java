package com.fyp.services;

import com.fyp.models.TflFare;
import com.fyp.repos.TflFareRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class TflFareService {

    private final TflFareRepository fareRepository;

    public TflFareService(TflFareRepository fareRepository) {
        this.fareRepository = fareRepository;
    }

    public Double calculateFare(String transportType, Integer fromZone, Integer toZone, Boolean isPeak) {
        // Bus is flat fare - no zones needed
        if ("Bus".equalsIgnoreCase(transportType)) {
            Optional<TflFare> busFare = fareRepository.findByTransportType("Bus");
            return busFare.map(TflFare::getPeakFare).orElse(1.75);
        }

        // Train/Tube fare based on zones
        if (fromZone == null || toZone == null) {
            return null;
        }

        // Normalize zones (smaller first for lookup)
        int minZone = Math.min(fromZone, toZone);
        int maxZone = Math.max(fromZone, toZone);

        Optional<TflFare> fare = fareRepository.findFare("Train", minZone, maxZone);

        if (fare.isPresent()) {
            TflFare f = fare.get();
            return Boolean.TRUE.equals(isPeak) ? f.getPeakFare() : f.getOffPeakFare();
        }

        // Fallback calculation if exact route not found
        return calculateFallbackFare(minZone, maxZone, isPeak);
    }

    private Double calculateFallbackFare(int minZone, int maxZone, Boolean isPeak) {
        // Simple fallback based on zone spread
        int zoneSpread = maxZone - minZone;
        boolean peak = Boolean.TRUE.equals(isPeak);

        if (minZone == 1) {
            // Journeys involving Zone 1
            return switch (zoneSpread) {
                case 0 -> peak ? 2.80 : 2.70;
                case 1 -> peak ? 3.40 : 2.80;
                case 2 -> peak ? 3.70 : 3.00;
                case 3 -> peak ? 4.40 : 3.20;
                case 4 -> peak ? 5.10 : 3.50;
                case 5 -> peak ? 5.60 : 3.60;
                default -> peak ? 5.60 : 3.60;
            };
        } else {
            // Journeys not involving Zone 1
            return peak ? 2.10 : 1.90;
        }
    }
}
