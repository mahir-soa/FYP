package com.fyp.repos;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fyp.models.Subscription;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
}
