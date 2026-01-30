package com.fyp.repos;

import org.springframework.data.jpa.repository.JpaRepository;
import com.fyp.models.ChatMessage;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByConversationIdOrderByCreatedAtAsc(Long conversationId);
}
