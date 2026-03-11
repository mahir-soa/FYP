package com.fyp.repos;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fyp.models.Expense;

import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByUserId(Long userId);
    List<Expense> findByUserIdOrderByDateDesc(Long userId);
    long countByUserId(Long userId);
}
