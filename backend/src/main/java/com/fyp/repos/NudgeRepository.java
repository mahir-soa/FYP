package com.fyp.repos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.fyp.models.Nudge;

import java.time.LocalDateTime;
import java.util.List;

public interface NudgeRepository extends JpaRepository<Nudge, Long> {

    List<Nudge> findByUserId(Long userId);

    @Query("SELECT n FROM Nudge n WHERE n.userId = :userId AND n.isDismissed = false " +
           "AND (n.expiresAt IS NULL OR n.expiresAt > :now) ORDER BY " +
           "CASE n.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, n.createdAt DESC")
    List<Nudge> findActiveNudges(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    @Query("SELECT n FROM Nudge n WHERE n.userId = :userId AND n.type = :type " +
           "AND n.relatedEntityType = :entityType AND n.relatedEntityId = :entityId " +
           "AND n.createdAt > :since")
    List<Nudge> findRecentDuplicates(@Param("userId") Long userId,
                                      @Param("type") String type,
                                      @Param("entityType") String entityType,
                                      @Param("entityId") Long entityId,
                                      @Param("since") LocalDateTime since);

    long countByUserIdAndIsReadFalseAndIsDismissedFalse(Long userId);

    @Query("SELECT n FROM Nudge n WHERE n.userId = :userId AND n.type = :type " +
           "AND n.trigger = :trigger AND n.createdAt > :since " +
           "ORDER BY n.createdAt DESC")
    List<Nudge> findRecentByTypeAndTrigger(@Param("userId") Long userId,
                                            @Param("type") String type,
                                            @Param("trigger") String trigger,
                                            @Param("since") LocalDateTime since);
}
