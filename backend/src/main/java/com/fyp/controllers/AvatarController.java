package com.fyp.controllers;

import com.fyp.models.AvatarCustomization;
import com.fyp.services.AvatarService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/avatar")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class AvatarController {

    private final AvatarService avatarService;

    public AvatarController(AvatarService avatarService) {
        this.avatarService = avatarService;
    }

    @GetMapping
    public ResponseEntity<?> getAvatar(@RequestParam Long userId) {
        AvatarCustomization ac = avatarService.getOrCreate(userId);
        return ResponseEntity.ok(toResponse(ac));
    }

    @PutMapping
    public ResponseEntity<?> updateAvatar(@RequestParam Long userId, @RequestBody Map<String, Object> body) {
        String equippedOptions = body.get("equippedOptions") != null ? body.get("equippedOptions").toString() : "{}";
        String equippedFrame = body.get("equippedFrame") != null ? body.get("equippedFrame").toString() : null;

        // Handle JSON object passed as map
        if (body.get("equippedOptions") instanceof Map) {
            try {
                equippedOptions = new com.fasterxml.jackson.databind.ObjectMapper()
                    .writeValueAsString(body.get("equippedOptions"));
            } catch (Exception e) {
                equippedOptions = "{}";
            }
        }

        AvatarCustomization ac = avatarService.updateEquipped(userId, equippedOptions, equippedFrame);
        return ResponseEntity.ok(toResponse(ac));
    }

    @GetMapping("/milestones")
    public ResponseEntity<?> getMilestones(@RequestParam Long userId) {
        Map<String, Object> result = avatarService.calculateMilestones(userId);
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> toResponse(AvatarCustomization ac) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("userId", ac.getUserId());
        response.put("equippedOptions", ac.getEquippedOptions());
        response.put("equippedFrame", ac.getEquippedFrame());
        response.put("unlockedItems", ac.getUnlockedItems());
        response.put("milestoneProgress", ac.getMilestoneProgress());
        return response;
    }
}
