package com.fyp.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pending_registrations")
public class PendingRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 6)
    private String otp;

    @Column(name = "otp_expiry", nullable = false)
    private LocalDateTime otpExpiry;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public PendingRegistration() {
    }

    public PendingRegistration(String name, String email, String password, String otp) {
        this.name = name;
        this.email = email;
        this.password = password;
        this.otp = otp;
        this.otpExpiry = LocalDateTime.now().plusMinutes(10);
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (otpExpiry == null) {
            otpExpiry = LocalDateTime.now().plusMinutes(10);
        }
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getOtp() {
        return otp;
    }

    public void setOtp(String otp) {
        this.otp = otp;
    }

    public LocalDateTime getOtpExpiry() {
        return otpExpiry;
    }

    public void setOtpExpiry(LocalDateTime otpExpiry) {
        this.otpExpiry = otpExpiry;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(otpExpiry);
    }
}
