package com.fyp.services;

import com.fyp.models.Expense;
import com.fyp.repos.ExpenseRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ChatService {

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.api.model}")
    private String model;

    private final ExpenseRepository expenseRepository;
    private final RestTemplate restTemplate;

    private static final String OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

    public ChatService(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
        this.restTemplate = new RestTemplate();
    }

    public String chat(String userMessage, boolean includeExpenseContext) {
        List<Map<String, String>> messages = new ArrayList<>();

        // System message - define the assistant's role
        String systemPrompt = buildSystemPrompt(includeExpenseContext);
        messages.add(Map.of("role", "system", "content", systemPrompt));

        // User message
        messages.add(Map.of("role", "user", "content", userMessage));

        // Build request body
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);
        requestBody.put("messages", messages);
        requestBody.put("max_tokens", 1000);
        requestBody.put("temperature", 0.7);

        // Set headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    OPENAI_API_URL,
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            Map<String, Object> responseBody = response.getBody();
            if (responseBody != null && responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> firstChoice = choices.get(0);
                    Map<String, String> message = (Map<String, String>) firstChoice.get("message");
                    return message.get("content");
                }
            }
            return "Sorry, I couldn't process your request.";
        } catch (Exception e) {
            e.printStackTrace();
            return "Error communicating with AI service: " + e.getMessage();
        }
    }

    private String buildSystemPrompt(boolean includeExpenseContext) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a helpful financial assistant for a personal expense tracking app. ");
        prompt.append("You help users understand their spending habits, provide budgeting advice, ");
        prompt.append("and offer personalized financial insights. Be friendly, concise, and supportive. ");
        prompt.append("When discussing finances, be encouraging rather than judgmental. ");

        if (includeExpenseContext) {
            List<Expense> expenses = expenseRepository.findAll();
            if (!expenses.isEmpty()) {
                prompt.append("\n\nHere is the user's expense data for context:\n");
                prompt.append(formatExpensesForContext(expenses));
                prompt.append("\n\nUse this data to provide personalized insights when relevant. ");
                prompt.append("If the user asks about their spending, reference specific data points.");
            }
        }

        return prompt.toString();
    }

    private String formatExpensesForContext(List<Expense> expenses) {
        // Group expenses by category
        Map<String, List<Expense>> byCategory = expenses.stream()
                .collect(Collectors.groupingBy(e -> e.getCategory() != null ? e.getCategory() : "Other"));

        StringBuilder sb = new StringBuilder();

        // Summary stats
        double total = expenses.stream().mapToDouble(Expense::getAmount).sum();
        sb.append(String.format("Total expenses: £%.2f across %d transactions\n", total, expenses.size()));

        // By category
        sb.append("Breakdown by category:\n");
        byCategory.forEach((category, catExpenses) -> {
            double catTotal = catExpenses.stream().mapToDouble(Expense::getAmount).sum();
            sb.append(String.format("- %s: £%.2f (%d transactions)\n", category, catTotal, catExpenses.size()));
        });

        // Recent expenses (last 10)
        sb.append("\nRecent transactions:\n");
        expenses.stream()
                .sorted((a, b) -> {
                    if (a.getDate() == null) return 1;
                    if (b.getDate() == null) return -1;
                    return b.getDate().compareTo(a.getDate());
                })
                .limit(10)
                .forEach(e -> {
                    sb.append(String.format("- %s: £%.2f (%s)%s\n",
                            e.getDate(),
                            e.getAmount(),
                            e.getCategory(),
                            e.getDescription() != null && !e.getDescription().isEmpty()
                                    ? " - " + e.getDescription() : ""));
                });

        return sb.toString();
    }
}
