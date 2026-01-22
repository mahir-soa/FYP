package com.fyp.repos;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fyp.models.Expense;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
}
