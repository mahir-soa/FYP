package com.fyp.controllers;

import com.fyp.models.Expense;
import com.fyp.repos.ExpenseRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@CrossOrigin(origins = "http://localhost:5173")
public class ExpenseController {

    private final ExpenseRepository expenseRepository;

    public ExpenseController(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    @GetMapping
    public List<Expense> getAllExpenses() {
        return expenseRepository.findAll();
    }

    @PostMapping
    public Expense createExpense(@RequestBody Expense expense) {
        return expenseRepository.save(expense);
    }

    @PutMapping("/{id}")
    public Expense updateExpense(@PathVariable Long id, @RequestBody Expense expense) {
        return expenseRepository.findById(id)
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
                    return expenseRepository.save(existing);
                })
                .orElseThrow(() -> new RuntimeException("Expense not found with id: " + id));
    }

    @DeleteMapping("/{id}")
    public void deleteExpense(@PathVariable Long id) {
        expenseRepository.deleteById(id);
    }
}
