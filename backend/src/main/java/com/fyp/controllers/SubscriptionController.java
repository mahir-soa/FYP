package com.fyp.controllers;

import com.fyp.models.Subscription;
import com.fyp.repos.SubscriptionRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/subscriptions")
@CrossOrigin(origins = "http://localhost:5173")
public class SubscriptionController {

    private final SubscriptionRepository subscriptionRepository;

    public SubscriptionController(SubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    @GetMapping
    public List<Subscription> getAllSubscriptions() {
        return subscriptionRepository.findAll();
    }

    @GetMapping("/{id}")
    public Subscription getSubscription(@PathVariable Long id) {
        return subscriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Subscription not found with id: " + id));
    }

    @PostMapping
    public Subscription createSubscription(@RequestBody Subscription subscription) {
        return subscriptionRepository.save(subscription);
    }

    @PutMapping("/{id}")
    public Subscription updateSubscription(@PathVariable Long id, @RequestBody Subscription subscription) {
        return subscriptionRepository.findById(id)
                .map(existing -> {
                    existing.setName(subscription.getName());
                    existing.setCost(subscription.getCost());
                    existing.setBillingCycle(subscription.getBillingCycle());
                    existing.setNextPaymentDate(subscription.getNextPaymentDate());
                    existing.setLastUsedDate(subscription.getLastUsedDate());
                    existing.setStatus(subscription.getStatus());
                    existing.setProviderKey(subscription.getProviderKey());
                    return subscriptionRepository.save(existing);
                })
                .orElseThrow(() -> new RuntimeException("Subscription not found with id: " + id));
    }

    @DeleteMapping("/{id}")
    public void deleteSubscription(@PathVariable Long id) {
        subscriptionRepository.deleteById(id);
    }

    @PatchMapping("/{id}/mark-used")
    public Subscription markAsUsed(@PathVariable Long id) {
        return subscriptionRepository.findById(id)
                .map(existing -> {
                    existing.setLastUsedDate(LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));
                    return subscriptionRepository.save(existing);
                })
                .orElseThrow(() -> new RuntimeException("Subscription not found with id: " + id));
    }

    @PatchMapping("/{id}/cancel")
    public Subscription cancelSubscription(@PathVariable Long id) {
        return subscriptionRepository.findById(id)
                .map(existing -> {
                    existing.setStatus("CANCELLED");
                    return subscriptionRepository.save(existing);
                })
                .orElseThrow(() -> new RuntimeException("Subscription not found with id: " + id));
    }

    @GetMapping("/upcoming")
    public List<Subscription> getUpcomingPayments(@RequestParam(defaultValue = "7") int days) {
        LocalDate today = LocalDate.now();
        LocalDate futureDate = today.plusDays(days);
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE;

        return subscriptionRepository.findAll().stream()
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
    public List<Subscription> getInactiveSubscriptions(@RequestParam(defaultValue = "30") int days) {
        LocalDate today = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE;

        return subscriptionRepository.findAll().stream()
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
