package com.fyp.repos;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fyp.models.Subscription;

import java.util.List;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    List<Subscription> findByUserId(Long userId);
}
