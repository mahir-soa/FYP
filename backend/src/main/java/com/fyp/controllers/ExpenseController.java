package com.fyp.controllers;

import com.fyp.models.Expense;
import com.fyp.repos.ExpenseRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class ExpenseController {

    private final ExpenseRepository expenseRepository;

    public ExpenseController(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    @GetMapping
    public List<Expense> getExpenses(@RequestParam Long userId) {
        return expenseRepository.findByUserIdOrderByDateDesc(userId);
    }

    @PostMapping
    public Expense createExpense(@RequestParam Long userId, @RequestBody Expense expense) {
        expense.setUserId(userId);
        return expenseRepository.save(expense);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Expense> updateExpense(
            @PathVariable Long id,
            @RequestParam Long userId,
            @RequestBody Expense expense) {
        return expenseRepository.findById(id)
                .filter(existing -> existing.getUserId() != null && existing.getUserId().equals(userId))
                .map(existing -> {
                    existing.setDate(expense.getDate());
                    existing.setDescription(expense.getDescription());
                    existing.setAmount(expense.getAmount());
                    existing.setCategory(expense.getCategory());
                    existing.setMood(expense.getMood());
                    existing.setSubType(expense.getSubType());
                    existing.setFromZone(expense.getFromZone());
                    existing.setToZone(expense.getToZone());
                    existing.setIsPeak(expense.getIsPeak());
                    return ResponseEntity.ok(expenseRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long id, @RequestParam Long userId) {
        return expenseRepository.findById(id)
                .filter(existing -> existing.getUserId() != null && existing.getUserId().equals(userId))
                .map(existing -> {
                    expenseRepository.deleteById(id);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
