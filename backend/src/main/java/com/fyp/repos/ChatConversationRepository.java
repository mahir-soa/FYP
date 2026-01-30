package com.fyp.repos;

import org.springframework.data.jpa.repository.JpaRepository;
import com.fyp.models.ChatConversation;
import java.util.List;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, Long> {
    List<ChatConversation> findByUserIdOrderByUpdatedAtDesc(Long userId);
}
