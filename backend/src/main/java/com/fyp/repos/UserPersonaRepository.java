package com.fyp.repos;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fyp.models.UserPersona;

import java.util.Optional;

public interface UserPersonaRepository extends JpaRepository<UserPersona, Long> {
    Optional<UserPersona> findByUserId(Long userId);
}
