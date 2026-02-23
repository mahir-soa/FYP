package com.fyp.services;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fyp.models.Expense;
import com.fyp.repos.ExpenseRepository;

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
        prompt.append("and offer personalised financial insights. Be friendly, concise, and supportive. ");
        prompt.append("When discussing finances, be encouraging rather than judgmental. ");

        // App knowledge so the assistant can answer questions about Nudge features
        prompt.append("\n\nHere is everything you need to know about the Nudge app and its features:\n\n");

        prompt.append("OVERVIEW: Nudge is a smart personal finance app that tracks expenses, income, subscriptions, bills, ");
        prompt.append("and budgets. It uses ML-driven persona analysis to understand each user's spending personality and ");
        prompt.append("adapts its budgeting, nudges, and advice accordingly.\n\n");

        prompt.append("BUDGET ENGINE — The budget is built in 5 layers (the 'waterfall'):\n");
        prompt.append("- Layer 1 (Financial Capacity): Monthly income + usable cash - bills - subscriptions - debt minimums = 'True Spendable'.\n");
        prompt.append("- Layer 2 (Goal Contributions): Deducts savings/outcome plan contributions from the spendable amount.\n");
        prompt.append("- Layer 3 (Context Modifiers): Active Priority Plans adjust category allocations (e.g. 'increase Food by 25%'). ");
        prompt.append("Adjustments can be percentage-based (LOW ±10%, MEDIUM ±25%, HIGH ±40%) or fixed £ amounts, capped at ±50%.\n");
        prompt.append("- Layer 4 (Adaptive Allocation): Splits budget across categories (Food, Travel, Leisure, Education, Other) ");
        prompt.append("using historical 3-month spending weights, applies context adjustments, and normalises. ");
        prompt.append("No category drops below a 5% floor. A 5% emergency buffer is reserved first.\n");
        prompt.append("- Layer 5 (Persona Modifiers): Applies persona-specific warning/pacing thresholds. Does NOT change the budget amounts.\n\n");

        prompt.append("BUFFER: The buffer is a 5% emergency reserve automatically set aside from the allocatable budget before ");
        prompt.append("category limits are calculated. It acts as a safety net for unexpected expenses. ");
        prompt.append("If you overspend in a category, the buffer absorbs the excess before it's flagged as truly over budget. ");
        prompt.append("The buffer remaining decreases as overspend occurs. Think of it as a financial cushion.\n\n");

        prompt.append("SAFE TO SPEND: The amount left after all category limits and the buffer are subtracted from the total budget. ");
        prompt.append("It's discretionary money not allocated to any category.\n\n");

        prompt.append("CATEGORIES: Food, Travel, Leisure, Education, Other. Each gets a limit based on historical spending patterns ");
        prompt.append("adjusted by any active context modifiers. Categories are tiered: ESSENTIAL, FLEXIBLE, or DISCRETIONARY.\n\n");

        prompt.append("PERSONA SYSTEM: ML analyses the user's spending patterns and assigns a persona type: ");
        prompt.append("Erratic Spender, Big Spender, Balanced Spender, Cautious Saver, Weekend Splurger, Volatile Spender, ");
        prompt.append("Late Night Spender, or Category Focused. Each persona gets tailored nudge styles, warning thresholds, ");
        prompt.append("and pacing guidance. Users can view their persona on the Persona page with a spider chart of traits.\n\n");

        prompt.append("PLANS: Users can create two types of plans:\n");
        prompt.append("- Outcome Plans (savings goals): Have a target amount, monthly contribution, and deadline. ");
        prompt.append("Contributions are deducted from the budget in Layer 2.\n");
        prompt.append("- Priority Plans (spending context): Modify budget allocation for specific categories. ");
        prompt.append("E.g. 'Holiday' plan that increases Food and Leisure. These are the context modifiers in Layer 3. ");
        prompt.append("They can have start/end dates and direction (INCREASE, REDUCE, PROTECT) with intensity.\n\n");

        prompt.append("NUDGES: Smart, persona-aware notifications. Types include: Budget Warning, Pacing Warning, ");
        prompt.append("Reallocation Suggested, Positive Reinforcement, and Weekend Pacing. ");
        prompt.append("Nudges have priority (HIGH/MEDIUM/LOW), cooldown windows (6-24h), and a max of 3 active at a time. ");
        prompt.append("They are scored by severity, persona fit, timing, and actionability.\n\n");

        prompt.append("REALLOCATION: When a user underspends in one category and overspends in another, ");
        prompt.append("Nudge can suggest reallocating unused budget between categories to stay on track overall.\n\n");

        prompt.append("SUBSCRIPTIONS & BILLS: Users track recurring subscriptions and bills/utilities. ");
        prompt.append("These are automatically deducted from income in Layer 1 of the budget engine.\n\n");

        prompt.append("EXPENSES & INCOME: Users log individual transactions with date, amount, category, and description. ");
        prompt.append("Income sources can be salary, freelance, or other, and can be recurring.\n\n");

        prompt.append("AI INSIGHTS: The budget page shows AI-generated insights that analyse spending patterns and offer tips.\n\n");

        prompt.append("When users ask about any of these features, explain them clearly using the information above. ");
        prompt.append("Always relate explanations back to the user's own financial situation when possible.\n");

        if (includeExpenseContext && userId != null) {
            List<Expense> expenses = expenseRepository.findByUserId(userId);
            if (!expenses.isEmpty()) {
                prompt.append("\n\nHere is the user's expense data for context:\n");
                prompt.append(formatExpensesForContext(expenses));
                prompt.append("\n\nUse this data to provide personalised insights when relevant. ");
                prompt.append("If the user asks about their spending, reference specific data points.");
            }
        }

        return prompt.toString();
    }

    public String generateBudgetInsights(Map<String, Object> budgetContext) {
        List<Map<String, String>> messages = new ArrayList<>();

        String systemPrompt = "You are a personal finance analyst for Nudge, a budgeting app. " +
                "Analyse the user's budget data and return 3-5 concise, actionable insights. " +
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

        String systemPrompt = "You are a personal finance budget optimiser for Nudge, a budgeting app. " +
                "Based on the user's spending history, income, and available budget, generate personalised category spending limits. " +
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

    public String parsePlan(String userInput) {
        List<Map<String, String>> messages = new ArrayList<>();

        String systemPrompt = "You are a financial plan parser for a budgeting app. " +
                "The user describes a financial plan in plain English. Parse it into structured JSON.\n\n" +
                "There are two families of plan:\n" +
                "- OUTCOME_PLAN: plans that reserve money toward a target (saving, paying debt, buying something, emergency fund)\n" +
                "- PRIORITY_PLAN: plans that temporarily adjust how budget is spread across spending categories " +
                "(e.g. spend more on food, cut back on leisure, tight budget mode)\n\n" +
                "CLASSIFY FAMILY FIRST before extracting any fields.\n\n" +
                "Return ONLY valid JSON (no markdown, no explanation). For a single plan, return one JSON object. " +
                "For explicit multi-direction input (e.g. 'increase food AND reduce leisure'), return a JSON array of objects.\n\n" +
                "Each object has this schema:\n" +
                "{\n" +
                "  \"family\": \"OUTCOME_PLAN\" | \"PRIORITY_PLAN\" | \"UNKNOWN\",\n" +
                "  \"confidence\": 0.0 to 1.0,\n" +
                "  \"title\": \"short name, 3-6 words\",\n" +
                "  \"cadence\": \"ONE_TIME\" | \"MONTHLY_RECURRING\",\n" +
                "  \"termination\": \"ON_DATE\" | \"AFTER_PERIOD\" | \"UNTIL_TARGET\" | \"OPEN_ENDED\",\n" +
                "  \"startDate\": \"YYYY-MM-DD\" or null,\n" +
                "  \"endDate\": \"YYYY-MM-DD\" or null,\n" +
                "  \"targetDate\": \"YYYY-MM-DD\" or null,\n" +
                "  \"durationMonths\": integer or null,\n" +
                "  \"reasonNote\": \"short reason\" or null,\n" +
                "  \"missingFields\": [\"fieldName\", ...],\n" +
                "  \"clarificationNeeded\": true or false,\n" +
                "  \"clarificationQuestions\": [\"question\", ...] or [],\n" +
                "  \"parserNotes\": \"internal notes\" or null,\n\n" +
                "  // OUTCOME_PLAN-only fields:\n" +
                "  \"outcomeCategory\": \"SAVINGS\" | \"DEBT\" | \"PURCHASE\" | \"EMERGENCY\" | null,\n" +
                "  \"targetAmount\": number or null,\n" +
                "  \"monthlyContribution\": number or null,\n\n" +
                "  // PRIORITY_PLAN-only fields:\n" +
                "  \"priorityCategories\": [\"Food\", \"Leisure\", ...] or null,\n" +
                "  \"direction\": \"INCREASE\" | \"REDUCE\" | \"PROTECT\" | null,\n" +
                "  \"intensity\": \"LOW\" | \"MEDIUM\" | \"HIGH\" | null,\n" +
                "  \"priorityAmount\": number or null\n" +
                "}\n\n" +
                "CADENCE (how often):\n" +
                "- ONE_TIME: single occurrence, this month only, one-time action\n" +
                "- MONTHLY_RECURRING: repeating — 'every month', 'ongoing', 'recurring', 'each month'\n" +
                "- Every well-formed plan has a cadence. If undetermined, add 'cadence' to missingFields and set clarificationNeeded=true.\n\n" +
                "TERMINATION (when it stops):\n" +
                "- ON_DATE: ends on a specific date — 'until [date]', 'by [date]' for time-bounded plans\n" +
                "- AFTER_PERIOD: ends after N months — 'for 3 months', 'next 6 months'. Set durationMonths and compute endDate.\n" +
                "- UNTIL_TARGET: ends when a milestone is reached — 'until I reach £X', 'pay off', 'save up to'\n" +
                "- OPEN_ENDED: no defined end — 'ongoing', 'indefinitely', 'from now on'\n" +
                "- Every well-formed plan has a termination. If undetermined, add 'termination' to missingFields and set clarificationNeeded=true.\n\n" +
                "CRITICAL PARSER GUARD: NEVER output cadence=ONE_TIME with termination=OPEN_ENDED for new inputs. " +
                "This combination means 'do it once, never ends' which is under-specified. " +
                "Instead, set clarificationNeeded=true and add a clarification question asking whether they mean " +
                "a one-time action with a target (UNTIL_TARGET) or by a date (ON_DATE).\n\n" +
                "FAMILY classification:\n" +
                "- Do NOT infer saving intent unless user explicitly says save/reserve/pay off/fund\n" +
                "- Saving, paying off, buying, building a fund = OUTCOME_PLAN\n" +
                "- Spending more/less on categories, lifestyle changes, temporary budget shifts = PRIORITY_PLAN\n" +
                "- If ambiguous, return UNKNOWN with clarificationNeeded=true\n\n" +
                "MULTI-DRAFT rules:\n" +
                "- Implicit lifestyle prompts (e.g. 'I'm bulking') -> single draft only, primary intent only\n" +
                "- Explicit multi-direction (e.g. 'increase food AND reduce leisure') -> return JSON array of multiple drafts, one per direction\n\n" +
                "OUTCOME_PLAN rules:\n" +
                "- outcomeCategory: DEBT (debt/loans/credit card), PURCHASE (buying something), EMERGENCY (emergency/rainy day), SAVINGS (otherwise)\n" +
                "- Amounts in GBP, no currency symbols in output\n" +
                "- Do NOT guess amounts or dates — leave null and add to missingFields\n\n" +
                "PRIORITY_PLAN rules:\n" +
                "- priorityCategories MUST only contain values from: Food, Travel, Education, Leisure, Other\n" +
                "- Each draft is single-direction: one direction per draft\n" +
                "- direction: INCREASE (spend more), REDUCE (spend less/cut back), PROTECT (keep stable)\n" +
                "- intensity: LOW (slight), MEDIUM (moderate), HIGH (strong/significant)\n" +
                "- 'bulking' / 'eating more' = priorityCategories=[\"Food\"], direction=INCREASE, intensity=MEDIUM\n" +
                "- 'tight budget' / 'saving mode' = priorityCategories=[\"Leisure\",\"Travel\"], direction=REDUCE, intensity=HIGH\n" +
                "- 'exam period' / 'studying' = priorityCategories=[\"Education\"], direction=INCREASE, intensity=MEDIUM\n" +
                "- priorityAmount: optional target amount for the priority (e.g. 'spend £200 more on food' -> priorityAmount=200). Leave null if no specific amount mentioned.\n\n" +
                "CONFIDENCE: numeric 0.0 to 1.0. 0.9=all fields clear, 0.6=reasonable inference, 0.3=vague/major assumptions.\n\n" +
                "DATE RULES:\n" +
                "- startDate: default to today if not stated\n" +
                "- endDate: hard cutoff for ON_DATE/AFTER_PERIOD termination\n" +
                "- targetDate: aspirational deadline for UNTIL_TARGET\n" +
                "- Do NOT set both endDate and targetDate\n" +
                "- For AFTER_PERIOD: set durationMonths AND compute endDate = startDate + durationMonths\n\n" +
                "Relative dates from today: " + java.time.LocalDate.now().toString() + "\n" +
                "Return ONLY the JSON, nothing else.";

        messages.add(Map.of("role", "system", "content", systemPrompt));
        messages.add(Map.of("role", "user", "content", userInput));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);
        requestBody.put("messages", messages);
        requestBody.put("max_tokens", 500);
        requestBody.put("temperature", 0.2);

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
