package com.fyp.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "bills")
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    private String name;

    private double amount;

    @Column(name = "due_day")
    private int dueDay; // Day of month (1-31) when bill is due

    private String frequency; // MONTHLY, QUARTERLY, YEARLY

    private String category; // RENT, ELECTRICITY, WATER, GAS, INTERNET, PHONE, INSURANCE, OTHER

    @Column(name = "is_paid")
    private boolean isPaid;

    @Column(name = "paid_date")
    private String paidDate;

    @Column(name = "last_paid_month")
    private String lastPaidMonth; // YYYY-MM format to track which month was paid

    private String notes;

    public Bill() {}

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }
    public int getDueDay() { return dueDay; }
    public void setDueDay(int dueDay) { this.dueDay = dueDay; }
    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public boolean isPaid() { return isPaid; }
    public void setPaid(boolean paid) { isPaid = paid; }
    public String getPaidDate() { return paidDate; }
    public void setPaidDate(String paidDate) { this.paidDate = paidDate; }
    public String getLastPaidMonth() { return lastPaidMonth; }
    public void setLastPaidMonth(String lastPaidMonth) { this.lastPaidMonth = lastPaidMonth; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
