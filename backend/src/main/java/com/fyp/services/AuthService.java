package com.fyp.services;

import com.fyp.models.PendingRegistration;
import com.fyp.models.User;
import com.fyp.repos.PendingRegistrationRepository;
import com.fyp.repos.UserRepository;
import com.fyp.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PendingRegistrationRepository pendingRegistrationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(UserRepository userRepository, PendingRegistrationRepository pendingRegistrationRepository,
                       PasswordEncoder passwordEncoder, JwtUtil jwtUtil, EmailService emailService) {
        this.userRepository = userRepository;
        this.pendingRegistrationRepository = pendingRegistrationRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
    }

    private String generateOtp() {
        int otp = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(otp);
    }

    @Transactional
    public Map<String, Object> register(String name, String email, String password) {
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already registered");
        }

        // Delete any existing pending registration for this email
        pendingRegistrationRepository.deleteByEmail(email);

        // Generate OTP
        String otp = generateOtp();

        // Create pending registration with hashed password
        PendingRegistration pending = new PendingRegistration(
            name,
            email,
            passwordEncoder.encode(password),
            otp
        );

        pendingRegistrationRepository.save(pending);

        // Send OTP email
        emailService.sendOtpEmail(email, name, otp);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Verification code sent to your email");
        response.put("email", email);
        return response;
    }

    @Transactional
    public Map<String, Object> verifyOtp(String email, String otp) {
        PendingRegistration pending = pendingRegistrationRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No pending registration found. Please register again."));

        if (pending.isExpired()) {
            pendingRegistrationRepository.delete(pending);
            throw new RuntimeException("Verification code has expired. Please register again.");
        }

        if (!pending.getOtp().equals(otp)) {
            throw new RuntimeException("Invalid verification code");
        }

        // Create the actual user account
        User user = new User(pending.getName(), pending.getEmail(), pending.getPassword());
        user.setEmailVerified(true); // Already verified via OTP
        userRepository.save(user);

        // Delete the pending registration
        pendingRegistrationRepository.delete(pending);

        // Generate JWT token for automatic login
        String token = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getName());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Account created successfully");
        response.put("token", token);
        response.put("user", getUserMap(user));
        return response;
    }

    @Transactional
    public Map<String, Object> resendOtp(String email) {
        PendingRegistration pending = pendingRegistrationRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No pending registration found. Please register again."));

        // Generate new OTP
        String newOtp = generateOtp();
        pending.setOtp(newOtp);
        pending.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
        pendingRegistrationRepository.save(pending);

        // Send new OTP email
        emailService.sendOtpEmail(email, pending.getName(), newOtp);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "New verification code sent to your email");
        return response;
    }

    public Map<String, Object> login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        if (!user.isEmailVerified()) {
            throw new RuntimeException("Please verify your email before logging in");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getName());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", getUserMap(user));
        return response;
    }

    public Map<String, Object> verifyEmail(String token) {
        User user = userRepository.findByVerificationToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid verification token"));

        if (user.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Verification token has expired");
        }

        user.setEmailVerified(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Email verified successfully");
        return response;
    }

    public Map<String, Object> resendVerification(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email not found"));

        if (user.isEmailVerified()) {
            throw new RuntimeException("Email is already verified");
        }

        user.setVerificationToken(UUID.randomUUID().toString());
        user.setVerificationTokenExpiry(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        emailService.sendVerificationEmail(email, user.getName(), user.getVerificationToken());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Verification email sent");
        return response;
    }

    public Map<String, Object> forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email not found"));

        user.setResetToken(UUID.randomUUID().toString());
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);

        emailService.sendPasswordResetEmail(email, user.getName(), user.getResetToken());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Password reset email sent");
        return response;
    }

    public Map<String, Object> resetPassword(String token, String newPassword) {
        User user = userRepository.findByResetToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid reset token"));

        if (user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Reset token has expired");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Password reset successfully");
        return response;
    }

    public Map<String, Object> getCurrentUser(String token) {
        if (!jwtUtil.isTokenValid(token)) {
            throw new RuntimeException("Invalid token");
        }

        Long userId = jwtUtil.extractUserId(token);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return getUserMap(user);
    }

    private Map<String, Object> getUserMap(User user) {
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", user.getId());
        userMap.put("name", user.getName());
        userMap.put("email", user.getEmail());
        userMap.put("emailVerified", user.isEmailVerified());
        return userMap;
    }
}
