package com.fyp.controllers;

import com.fyp.models.Subscription;
import com.fyp.repos.SubscriptionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/subscriptions")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class SubscriptionController {

    private final SubscriptionRepository subscriptionRepository;

    public SubscriptionController(SubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    // Static UK pricing database for subscription providers
    private static final Map<String, List<Map<String, Object>>> PROVIDER_PRICING = new HashMap<>();

    static {
        // Streaming - Netflix
        PROVIDER_PRICING.put("netflix", Arrays.asList(
            Map.of("plan", "Standard with ads", "price", 4.99, "cycle", "MONTHLY"),
            Map.of("plan", "Standard", "price", 10.99, "cycle", "MONTHLY"),
            Map.of("plan", "Premium", "price", 17.99, "cycle", "MONTHLY")
        ));

        // Streaming - Prime Video
        PROVIDER_PRICING.put("prime", Arrays.asList(
            Map.of("plan", "Prime Video", "price", 5.99, "cycle", "MONTHLY"),
            Map.of("plan", "Amazon Prime", "price", 8.99, "cycle", "MONTHLY"),
            Map.of("plan", "Amazon Prime Annual", "price", 95.00, "cycle", "YEARLY")
        ));

        // Streaming - Disney+
        PROVIDER_PRICING.put("disney", Arrays.asList(
            Map.of("plan", "Standard with ads", "price", 4.99, "cycle", "MONTHLY"),
            Map.of("plan", "Standard", "price", 7.99, "cycle", "MONTHLY"),
            Map.of("plan", "Premium", "price", 10.99, "cycle", "MONTHLY")
        ));

        // Streaming - Hulu
        PROVIDER_PRICING.put("hulu", Arrays.asList(
            Map.of("plan", "With ads", "price", 5.99, "cycle", "MONTHLY"),
            Map.of("plan", "No ads", "price", 12.99, "cycle", "MONTHLY")
        ));

        // Streaming - HBO Max
        PROVIDER_PRICING.put("hbo", Arrays.asList(
            Map.of("plan", "With ads", "price", 5.99, "cycle", "MONTHLY"),
            Map.of("plan", "Standard", "price", 10.99, "cycle", "MONTHLY")
        ));

        // Streaming - YouTube Premium
        PROVIDER_PRICING.put("youtube", Arrays.asList(
            Map.of("plan", "Individual", "price", 12.99, "cycle", "MONTHLY"),
            Map.of("plan", "Family", "price", 19.99, "cycle", "MONTHLY"),
            Map.of("plan", "Student", "price", 7.49, "cycle", "MONTHLY")
        ));

        // Music - Spotify
        PROVIDER_PRICING.put("spotify", Arrays.asList(
            Map.of("plan", "Individual", "price", 10.99, "cycle", "MONTHLY"),
            Map.of("plan", "Duo", "price", 14.99, "cycle", "MONTHLY"),
            Map.of("plan", "Family", "price", 17.99, "cycle", "MONTHLY"),
            Map.of("plan", "Student", "price", 5.99, "cycle", "MONTHLY")
        ));

        // Music - Apple Music
        PROVIDER_PRICING.put("apple", Arrays.asList(
            Map.of("plan", "Individual", "price", 10.99, "cycle", "MONTHLY"),
            Map.of("plan", "Family", "price", 16.99, "cycle", "MONTHLY"),
            Map.of("plan", "Student", "price", 5.99, "cycle", "MONTHLY")
        ));

        // Gym - PureGym
        PROVIDER_PRICING.put("puregym", Arrays.asList(
            Map.of("plan", "Day Pass", "price", 7.99, "cycle", "MONTHLY"),
            Map.of("plan", "Standard", "price", 19.99, "cycle", "MONTHLY"),
            Map.of("plan", "Plus", "price", 26.99, "cycle", "MONTHLY")
        ));

        // Gym - The Gym
        PROVIDER_PRICING.put("thegym", Arrays.asList(
            Map.of("plan", "Standard", "price", 17.99, "cycle", "MONTHLY"),
            Map.of("plan", "Live It", "price", 22.99, "cycle", "MONTHLY")
        ));

        // Gym - David Lloyd
        PROVIDER_PRICING.put("davidlloyd", Arrays.asList(
            Map.of("plan", "Club", "price", 89.00, "cycle", "MONTHLY"),
            Map.of("plan", "Premium", "price", 129.00, "cycle", "MONTHLY")
        ));

        // Gym - Virgin Active
        PROVIDER_PRICING.put("virgin", Arrays.asList(
            Map.of("plan", "Peak", "price", 75.00, "cycle", "MONTHLY"),
            Map.of("plan", "Off Peak", "price", 55.00, "cycle", "MONTHLY")
        ));

        // Gym - Nuffield Health
        PROVIDER_PRICING.put("nuffield", Arrays.asList(
            Map.of("plan", "Standard", "price", 65.00, "cycle", "MONTHLY"),
            Map.of("plan", "Off Peak", "price", 45.00, "cycle", "MONTHLY")
        ));

        // Gym - Gymshark (Training App)
        PROVIDER_PRICING.put("gymshark", Arrays.asList(
            Map.of("plan", "Monthly", "price", 9.99, "cycle", "MONTHLY"),
            Map.of("plan", "Annual", "price", 59.99, "cycle", "YEARLY")
        ));

        // Gaming - Xbox Game Pass
        PROVIDER_PRICING.put("xbox", Arrays.asList(
            Map.of("plan", "Core", "price", 6.99, "cycle", "MONTHLY"),
            Map.of("plan", "Standard", "price", 10.99, "cycle", "MONTHLY"),
            Map.of("plan", "Ultimate", "price", 14.99, "cycle", "MONTHLY")
        ));

        // Gaming - PlayStation Plus
        PROVIDER_PRICING.put("playstation", Arrays.asList(
            Map.of("plan", "Essential Monthly", "price", 6.99, "cycle", "MONTHLY"),
            Map.of("plan", "Extra Monthly", "price", 10.99, "cycle", "MONTHLY"),
            Map.of("plan", "Premium Monthly", "price", 13.49, "cycle", "MONTHLY")
        ));

        // Gaming - Nintendo Online
        PROVIDER_PRICING.put("nintendo", Arrays.asList(
            Map.of("plan", "Individual", "price", 3.49, "cycle", "MONTHLY"),
            Map.of("plan", "Family Annual", "price", 34.99, "cycle", "YEARLY"),
            Map.of("plan", "Expansion Pack Annual", "price", 69.99, "cycle", "YEARLY")
        ));

        // Software - Adobe CC
        PROVIDER_PRICING.put("adobe", Arrays.asList(
            Map.of("plan", "Photography", "price", 9.98, "cycle", "MONTHLY"),
            Map.of("plan", "Single App", "price", 22.98, "cycle", "MONTHLY"),
            Map.of("plan", "All Apps", "price", 54.98, "cycle", "MONTHLY")
        ));

        // Software - Microsoft 365
        PROVIDER_PRICING.put("microsoft", Arrays.asList(
            Map.of("plan", "Personal", "price", 5.99, "cycle", "MONTHLY"),
            Map.of("plan", "Family", "price", 7.99, "cycle", "MONTHLY"),
            Map.of("plan", "Personal Annual", "price", 59.99, "cycle", "YEARLY"),
            Map.of("plan", "Family Annual", "price", 79.99, "cycle", "YEARLY")
        ));

        // Software - Notion
        PROVIDER_PRICING.put("notion", Arrays.asList(
            Map.of("plan", "Free", "price", 0.00, "cycle", "MONTHLY"),
            Map.of("plan", "Plus", "price", 7.50, "cycle", "MONTHLY"),
            Map.of("plan", "Business", "price", 12.50, "cycle", "MONTHLY")
        ));
    }

    @GetMapping("/pricing/{providerKey}")
    public Map<String, Object> getProviderPricing(@PathVariable String providerKey) {
        List<Map<String, Object>> plans = PROVIDER_PRICING.get(providerKey);
        Map<String, Object> response = new HashMap<>();
        response.put("provider", providerKey);
        response.put("plans", plans != null ? plans : Collections.emptyList());
        response.put("hasPlans", plans != null && !plans.isEmpty());
        return response;
    }

    @GetMapping("/pricing")
    public Map<String, List<Map<String, Object>>> getAllPricing() {
        return PROVIDER_PRICING;
    }

    @GetMapping
    public List<Subscription> getSubscriptions(@RequestParam Long userId) {
        return subscriptionRepository.findByUserId(userId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Subscription> getSubscription(@PathVariable Long id, @RequestParam Long userId) {
        return subscriptionRepository.findById(id)
                .filter(sub -> sub.getUserId() == null || sub.getUserId().equals(userId))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Subscription createSubscription(@RequestParam Long userId, @RequestBody Subscription subscription) {
        subscription.setUserId(userId);
        return subscriptionRepository.save(subscription);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Subscription> updateSubscription(
            @PathVariable Long id,
            @RequestParam Long userId,
            @RequestBody Subscription subscription) {
        return subscriptionRepository.findById(id)
                .filter(existing -> existing.getUserId() == null || existing.getUserId().equals(userId))
                .map(existing -> {
                    if (existing.getUserId() == null) {
                        existing.setUserId(userId);
                    }
                    existing.setName(subscription.getName());
                    existing.setCost(subscription.getCost());
                    existing.setBillingCycle(subscription.getBillingCycle());
                    existing.setNextPaymentDate(subscription.getNextPaymentDate());
                    existing.setLastUsedDate(subscription.getLastUsedDate());
                    existing.setStatus(subscription.getStatus());
                    existing.setProviderKey(subscription.getProviderKey());
                    existing.setCategory(subscription.getCategory());
                    return ResponseEntity.ok(subscriptionRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSubscription(@PathVariable Long id, @RequestParam Long userId) {
        return subscriptionRepository.findById(id)
                .filter(existing -> existing.getUserId() == null || existing.getUserId().equals(userId))
                .map(existing -> {
                    subscriptionRepository.deleteById(id);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/mark-used")
    public ResponseEntity<?> markAsUsed(@PathVariable Long id, @RequestParam Long userId) {
        try {
            Optional<Subscription> subOpt = subscriptionRepository.findById(id);
            if (subOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Subscription not found"));
            }
            Subscription existing = subOpt.get();
            if (existing.getUserId() != null && !existing.getUserId().equals(userId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Not authorized"));
            }
            if (existing.getUserId() == null) {
                existing.setUserId(userId);
            }
            existing.setLastUsedDate(LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));
            Subscription saved = subscriptionRepository.save(existing);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Subscription> cancelSubscription(@PathVariable Long id, @RequestParam Long userId) {
        return subscriptionRepository.findById(id)
                .filter(existing -> existing.getUserId() == null || existing.getUserId().equals(userId))
                .map(existing -> {
                    if (existing.getUserId() == null) {
                        existing.setUserId(userId);
                    }
                    existing.setStatus("CANCELLED");
                    return ResponseEntity.ok(subscriptionRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/upcoming")
    public List<Subscription> getUpcomingPayments(@RequestParam Long userId, @RequestParam(defaultValue = "7") int days) {
        LocalDate today = LocalDate.now();
        LocalDate futureDate = today.plusDays(days);
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE;

        return subscriptionRepository.findByUserId(userId).stream()
                .filter(sub -> "ACTIVE".equals(sub.getStatus()))
                .filter(sub -> {
                    if (sub.getNextPaymentDate() == null) return false;
                    try {
                        LocalDate paymentDate = LocalDate.parse(sub.getNextPaymentDate(), formatter);
                        return !paymentDate.isBefore(today) && !paymentDate.isAfter(futureDate);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/inactive")
    public List<Subscription> getInactiveSubscriptions(@RequestParam Long userId, @RequestParam(defaultValue = "30") int days) {
        LocalDate today = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE;

        return subscriptionRepository.findByUserId(userId).stream()
                .filter(sub -> "ACTIVE".equals(sub.getStatus()))
                .filter(sub -> {
                    if (sub.getLastUsedDate() == null) return true;
                    try {
                        LocalDate lastUsed = LocalDate.parse(sub.getLastUsedDate(), formatter);
                        long daysSinceUsed = ChronoUnit.DAYS.between(lastUsed, today);
                        return daysSinceUsed >= days;
                    } catch (Exception e) {
                        return true;
                    }
                })
                .collect(Collectors.toList());
    }
}
