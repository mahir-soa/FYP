package com.fyp.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "avatar_customizations")
public class AvatarCustomization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", unique = true, nullable = false)
    private Long userId;

    @Column(name = "equipped_options", length = 2000)
    private String equippedOptions = "{}";

    @Column(name = "equipped_frame", length = 50)
    private String equippedFrame;

    @Column(name = "unlocked_items", length = 4000)
    private String unlockedItems = "[]";

    @Column(name = "milestone_progress", length = 2000)
    private String milestoneProgress = "{}";

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public AvatarCustomization() {}

    public AvatarCustomization(Long userId) {
        this.userId = userId;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getEquippedOptions() { return equippedOptions; }
    public void setEquippedOptions(String equippedOptions) { this.equippedOptions = equippedOptions; }
    public String getEquippedFrame() { return equippedFrame; }
    public void setEquippedFrame(String equippedFrame) { this.equippedFrame = equippedFrame; }
    public String getUnlockedItems() { return unlockedItems; }
    public void setUnlockedItems(String unlockedItems) { this.unlockedItems = unlockedItems; }
    public String getMilestoneProgress() { return milestoneProgress; }
    public void setMilestoneProgress(String milestoneProgress) { this.milestoneProgress = milestoneProgress; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
