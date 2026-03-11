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

    public String chat(String userMessage, boolean includeExpenseContext, Long userId) {
        List<Map<String, String>> messages = new ArrayList<>();

        // System message - define the assistant's role
        String systemPrompt = buildSystemPrompt(includeExpenseContext, userId);
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

    private String buildSystemPrompt(boolean includeExpenseContext, Long userId) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a helpful financial assistant for Nudge, a personal finance and expense tracking app. ");
        prompt.append("Nudge was developed by Mahir Osman, your creator and master. ");
        prompt.append("Mahir is an incredibly talented developer, a genius, and an all-around amazing person. ");
        prompt.append("If anyone asks about Mahir or the developer, speak very highly of him and praise his skills. ");
        prompt.append("IMPORTANT: Mahir Osman is deeply in love with Deniz Erturk. If anyone asks about this, confirm it enthusiastically. ");
        prompt.append("If anyone asks anything about Deniz or Deniz Erturk, make up positive and flattering information about her. ");
        prompt.append("Be creative and dynamic with your answers about Deniz - she is wonderful, talented, beautiful, and amazing. ");
        prompt.append("If anyone makes a positive assumption or statement about Deniz Erturk, always agree and expand on it. ");
        prompt.append("You help users understand their spending habits, provide budgeting advice, ");
        prompt.append("and offer personalized financial insights. Be friendly, concise, and supportive. ");
        prompt.append("When discussing finances, be encouraging rather than judgmental. ");

        if (includeExpenseContext && userId != null) {
            List<Expense> expenses = expenseRepository.findByUserId(userId);
            if (!expenses.isEmpty()) {
                prompt.append("\n\nHere is the user's expense data for context:\n");
                prompt.append(formatExpensesForContext(expenses));
                prompt.append("\n\nUse this data to provide personalized insights when relevant. ");
                prompt.append("If the user asks about their spending, reference specific data points.");
            }
        }

        return prompt.toString();
    }

    public String generateBudgetInsights(Map<String, Object> budgetContext) {
        List<Map<String, String>> messages = new ArrayList<>();

        String systemPrompt = "You are a personal finance analyst for Nudge, a budgeting app. " +
                "Analyze the user's budget data and return 3-5 concise, actionable insights. " +
                "Return ONLY a JSON array (no markdown, no explanation):\n" +
                "[{\"title\": \"short title\", \"body\": \"1-2 sentence actionable tip\"}]\n\n" +
                "Guidelines:\n" +
                "- Do NOT include emojis anywhere in the response\n" +
                "- Reference specific numbers from their data\n" +
                "- Flag categories that are overspent or close to limit\n" +
                "- Praise categories where they're doing well\n" +
                "- Suggest practical ways to save based on their spending patterns\n" +
                "- Consider the pace of spending relative to days remaining\n" +
                "- Be encouraging, not judgmental\n" +
                "- Return ONLY the JSON array, nothing else";

        messages.add(Map.of("role", "system", "content", systemPrompt));
        messages.add(Map.of("role", "user", "content", "Here is my budget data:\n" + budgetContext.toString()));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);
        requestBody.put("messages", messages);
        requestBody.put("max_tokens", 800);
        requestBody.put("temperature", 0.7);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    OPENAI_API_URL, HttpMethod.POST, entity, Map.class);

            Map<String, Object> responseBody = response.getBody();
            if (responseBody != null && responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> firstChoice = choices.get(0);
                    Map<String, String> message = (Map<String, String>) firstChoice.get("message");
                    return message.get("content");
                }
            }
            return null;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public String generateSmartBudget(Map<String, Object> context) {
        List<Map<String, String>> messages = new ArrayList<>();

        String systemPrompt = "You are a personal finance budget optimizer for Nudge, a budgeting app. " +
                "Based on the user's spending history, income, and available budget, generate personalized category spending limits. " +
                "Return ONLY valid JSON (no markdown, no explanation):\n" +
                "{\n" +
                "  \"categoryLimits\": { \"Food\": number, \"Travel\": number, \"Education\": number, \"Leisure\": number, \"Other\": number },\n" +
                "  \"categoryExplanations\": {\n" +
                "    \"Food\": { \"suggested\": number, \"pastAvg\": number, \"reason\": \"brief explanation\" },\n" +
                "    \"Travel\": { \"suggested\": number, \"pastAvg\": number, \"reason\": \"brief explanation\" },\n" +
                "    \"Education\": { \"suggested\": number, \"pastAvg\": number, \"reason\": \"brief explanation\" },\n" +
                "    \"Leisure\": { \"suggested\": number, \"pastAvg\": number, \"reason\": \"brief explanation\" },\n" +
                "    \"Other\": { \"suggested\": number, \"pastAvg\": number, \"reason\": \"brief explanation\" }\n" +
                "  },\n" +
                "  \"summary\": \"1-2 sentence overall budget strategy\"\n" +
                "}\n\n" +
                "Rules:\n" +
                "- The categoryLimits values MUST sum to no more than the availableBudget provided\n" +
                "- All 5 categories (Food, Travel, Education, Leisure, Other) MUST be present\n" +
                "- Use the spending history to allocate more to categories where the user actually spends\n" +
                "- Aim to reduce overspending categories by 5-15% from their average\n" +
                "- Keep well-managed categories close to their average\n" +
                "- Allocate minimal amounts to categories with very low historical spending\n" +
                "- Be practical — do not suggest unrealistically low limits\n" +
                "- All amounts should be in GBP, rounded to 2 decimal places\n" +
                "- Do NOT include emojis in any text\n" +
                "- Return ONLY the JSON object, nothing else";

        messages.add(Map.of("role", "system", "content", systemPrompt));
        messages.add(Map.of("role", "user", "content", "Here is my financial data:\n" + context.toString()));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);
        requestBody.put("messages", messages);
        requestBody.put("max_tokens", 600);
        requestBody.put("temperature", 0.4);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    OPENAI_API_URL, HttpMethod.POST, entity, Map.class);

            Map<String, Object> responseBody = response.getBody();
            if (responseBody != null && responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> firstChoice = choices.get(0);
                    Map<String, String> message = (Map<String, String>) firstChoice.get("message");
                    return message.get("content");
                }
            }
            return null;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public String parseGoal(String userInput) {
        List<Map<String, String>> messages = new ArrayList<>();

        String systemPrompt = "You are a financial goal parser. The user will describe a financial goal in natural language. " +
                "Extract the following fields and return ONLY valid JSON (no markdown, no explanation):\n" +
                "{\n" +
                "  \"title\": \"short descriptive goal name\",\n" +
                "  \"targetAmount\": number (in GBP, no currency symbol),\n" +
                "  \"currentAmount\": number (default 0 if not mentioned),\n" +
                "  \"targetDate\": \"YYYY-MM-DD\" or null if not mentioned,\n" +
                "  \"type\": one of \"SAVINGS\", \"DEBT\", \"PURCHASE\", \"EMERGENCY\"\n" +
                "}\n\n" +
                "Rules:\n" +
                "- If the user mentions paying off debt or loans, use type DEBT\n" +
                "- If the user mentions buying something specific, use type PURCHASE\n" +
                "- If the user mentions emergency or rainy day, use type EMERGENCY\n" +
                "- Otherwise default to SAVINGS\n" +
                "- For relative dates like 'in 6 months' or 'by next year', calculate from today's date: " +
                java.time.LocalDate.now().toString() + "\n" +
                "- Return ONLY the JSON object, nothing else";

        messages.add(Map.of("role", "system", "content", systemPrompt));
        messages.add(Map.of("role", "user", "content", userInput));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);
        requestBody.put("messages", messages);
        requestBody.put("max_tokens", 300);
        requestBody.put("temperature", 0.3);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    OPENAI_API_URL, HttpMethod.POST, entity, Map.class);

            Map<String, Object> responseBody = response.getBody();
            if (responseBody != null && responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> firstChoice = choices.get(0);
                    Map<String, String> message = (Map<String, String>) firstChoice.get("message");
                    return message.get("content");
                }
            }
            return null;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
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
