package com.fyp.repos;

import com.fyp.models.AvatarCustomization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AvatarCustomizationRepository extends JpaRepository<AvatarCustomization, Long> {
    Optional<AvatarCustomization> findByUserId(Long userId);
}
