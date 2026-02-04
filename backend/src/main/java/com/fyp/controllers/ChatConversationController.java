package com.fyp.controllers;

import com.fyp.models.ChatConversation;
import com.fyp.models.ChatMessage;
import com.fyp.repos.ChatConversationRepository;
import com.fyp.repos.ChatMessageRepository;
import com.fyp.services.ChatService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/conversations")
@CrossOrigin(origins = "http://localhost:5173")
public class ChatConversationController {

    private final ChatConversationRepository conversationRepository;
    private final ChatMessageRepository messageRepository;
    private final ChatService chatService;

    public ChatConversationController(
            ChatConversationRepository conversationRepository,
            ChatMessageRepository messageRepository,
            ChatService chatService) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.chatService = chatService;
    }

    @GetMapping
    public List<ChatConversation> getAllConversations(@RequestParam(required = false) Long userId) {
        if (userId != null) {
            return conversationRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        }
        return conversationRepository.findAll();
    }

    @GetMapping("/{id}")
    public ChatConversation getConversation(@PathVariable Long id) {
        return conversationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
    }

    @GetMapping("/{id}/messages")
    public List<ChatMessage> getMessages(@PathVariable Long id) {
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(id);
    }

    @PostMapping
    public ChatConversation createConversation(@RequestBody Map<String, Object> body) {
        ChatConversation conversation = new ChatConversation();
        conversation.setTitle((String) body.getOrDefault("title", "New Chat"));
        if (body.containsKey("userId")) {
            Object userIdObj = body.get("userId");
            if (userIdObj instanceof Number) {
                conversation.setUserId(((Number) userIdObj).longValue());
            }
        }
        return conversationRepository.save(conversation);
    }

    @PutMapping("/{id}")
    public ChatConversation updateConversation(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return conversationRepository.findById(id)
                .map(conv -> {
                    if (body.containsKey("title")) {
                        conv.setTitle(body.get("title"));
                    }
                    return conversationRepository.save(conv);
                })
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
    }

    @DeleteMapping("/{id}")
    public void deleteConversation(@PathVariable Long id) {
        conversationRepository.deleteById(id);
    }

    @PostMapping("/{id}/messages")
    public Map<String, Object> addMessageAndGetResponse(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        ChatConversation conversation = conversationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        String userContent = (String) body.get("message");
        boolean includeContext = body.containsKey("includeExpenseContext")
                ? (Boolean) body.get("includeExpenseContext")
                : true;

        // Save user message
        ChatMessage userMessage = new ChatMessage(conversation, "user", userContent);
        messageRepository.save(userMessage);

        // Get AI response with user context
        String aiResponse = chatService.chat(userContent, includeContext, conversation.getUserId());

        // Save assistant message
        ChatMessage assistantMessage = new ChatMessage(conversation, "assistant", aiResponse);
        messageRepository.save(assistantMessage);

        // Update conversation title if it's the first message
        if (conversation.getTitle().equals("New Chat")) {
            String title = userContent.length() > 30
                    ? userContent.substring(0, 30) + "..."
                    : userContent;
            conversation.setTitle(title);
            conversationRepository.save(conversation);
        }

        // Update conversation timestamp
        conversationRepository.save(conversation);

        return Map.of(
                "response", aiResponse,
                "userMessage", userMessage,
                "assistantMessage", assistantMessage,
                "conversation", conversation
        );
    }
}
