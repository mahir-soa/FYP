package com.fyp.controllers;

import com.fyp.models.Income;
import com.fyp.repos.IncomeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/incomes")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class IncomeController {

    private final IncomeRepository incomeRepository;

    public IncomeController(IncomeRepository incomeRepository) {
        this.incomeRepository = incomeRepository;
    }

    @GetMapping
    public List<Income> getIncomes(@RequestParam Long userId) {
        return incomeRepository.findByUserIdOrderByDateDesc(userId);
    }

    @PostMapping
    public Income createIncome(@RequestParam Long userId, @RequestBody Income income) {
        income.setUserId(userId);
        return incomeRepository.save(income);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Income> updateIncome(
            @PathVariable Long id,
            @RequestParam Long userId,
            @RequestBody Income income) {
        return incomeRepository.findById(id)
                .filter(existing -> existing.getUserId() != null && existing.getUserId().equals(userId))
                .map(existing -> {
                    existing.setSource(income.getSource());
                    existing.setAmount(income.getAmount());
                    existing.setDate(income.getDate());
                    existing.setFrequency(income.getFrequency());
                    return ResponseEntity.ok(incomeRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteIncome(@PathVariable Long id, @RequestParam Long userId) {
        return incomeRepository.findById(id)
                .filter(existing -> existing.getUserId() != null && existing.getUserId().equals(userId))
                .map(existing -> {
                    incomeRepository.deleteById(id);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
