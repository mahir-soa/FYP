package com.fyp.controllers;

import com.fyp.models.FinancialProfile;
import com.fyp.repos.FinancialProfileRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/financial-profile")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class FinancialProfileController {

    private final FinancialProfileRepository financialProfileRepository;

    public FinancialProfileController(FinancialProfileRepository financialProfileRepository) {
        this.financialProfileRepository = financialProfileRepository;
    }

    @GetMapping
    public ResponseEntity<FinancialProfile> getProfile(@RequestParam Long userId) {
        return financialProfileRepository.findByUserId(userId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    FinancialProfile defaults = new FinancialProfile();
                    defaults.setUserId(userId);
                    defaults.setCurrentBalance(0);
                    defaults.setSafetyReserve(0);
                    defaults.setDebtMinimumMonthly(0);
                    defaults.setUsableBalancePercent(0.10);
                    return ResponseEntity.ok(defaults);
                });
    }

    @PutMapping
    public ResponseEntity<FinancialProfile> upsertProfile(@RequestParam Long userId,
                                                           @RequestBody FinancialProfile profile) {
        FinancialProfile existing = financialProfileRepository.findByUserId(userId).orElse(null);
        if (existing == null) {
            existing = new FinancialProfile();
            existing.setUserId(userId);
        }
        existing.setCurrentBalance(profile.getCurrentBalance());
        existing.setUsableBalancePercent(profile.getUsableBalancePercent());
        existing.setSafetyReserve(profile.getSafetyReserve());
        existing.setDebtMinimumMonthly(profile.getDebtMinimumMonthly());
        existing.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(financialProfileRepository.save(existing));
    }
}
