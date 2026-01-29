package com.fyp.repos;

import com.fyp.models.PendingRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PendingRegistrationRepository extends JpaRepository<PendingRegistration, Long> {

    Optional<PendingRegistration> findByEmail(String email);

    Optional<PendingRegistration> findByEmailAndOtp(String email, String otp);

    @Modifying
    void deleteByEmail(String email);

    @Modifying
    void deleteByOtpExpiryBefore(LocalDateTime dateTime);

    boolean existsByEmail(String email);
}
