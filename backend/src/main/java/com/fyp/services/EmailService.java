package com.fyp.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtpEmail(String to, String name, String otp) {
        // Always log the OTP for development/testing
        logger.info("========================================");
        logger.info("OTP VERIFICATION EMAIL for {}", to);
        logger.info("OTP Code: {}", otp);
        logger.info("========================================");

        String subject = "Your Verification Code - ExpenseTracker";

        String htmlContent = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #16a34a; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">ExpenseTracker</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                    <h2 style="color: #111827;">Hi %s,</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                        Thanks for signing up! Use the verification code below to complete your registration.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background: #111827; color: white; padding: 20px 40px; border-radius: 12px; display: inline-block;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">%s</span>
                        </div>
                    </div>
                    <p style="color: #6b7280; font-size: 14px; text-align: center;">
                        This code will expire in <strong>10 minutes</strong>.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                    <p style="color: #9ca3af; font-size: 12px;">
                        If you didn't create an account, you can safely ignore this email.
                    </p>
                </div>
            </div>
            """.formatted(name, otp);

        try {
            sendHtmlEmail(to, subject, htmlContent);
            logger.info("OTP email sent successfully to {}", to);
        } catch (Exception e) {
            logger.warn("Failed to send OTP email to {}: {}. Use the logged OTP above to verify manually.", to, e.getMessage());
        }
    }

    public void sendVerificationEmail(String to, String name, String token) {
        String verifyUrl = frontendUrl + "/verify-email?token=" + token;

        // Always log the URL for development/testing
        logger.info("========================================");
        logger.info("VERIFICATION EMAIL for {}", to);
        logger.info("Verify URL: {}", verifyUrl);
        logger.info("========================================");

        String subject = "Verify Your Email - ExpenseTracker";

        String htmlContent = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #16a34a; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">ExpenseTracker</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                    <h2 style="color: #111827;">Hi %s,</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                        Thanks for signing up! Please verify your email address by clicking the button below.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="%s" style="background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            Verify Email
                        </a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                        This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                    <p style="color: #9ca3af; font-size: 12px;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="%s" style="color: #16a34a;">%s</a>
                    </p>
                </div>
            </div>
            """.formatted(name, verifyUrl, verifyUrl, verifyUrl);

        try {
            sendHtmlEmail(to, subject, htmlContent);
            logger.info("Verification email sent successfully to {}", to);
        } catch (Exception e) {
            logger.warn("Failed to send verification email to {}: {}. Use the logged URL above to verify manually.", to, e.getMessage());
        }
    }

    public void sendPasswordResetEmail(String to, String name, String token) {
        String resetUrl = frontendUrl + "/reset-password?token=" + token;

        // Always log the URL for development/testing
        logger.info("========================================");
        logger.info("PASSWORD RESET EMAIL for {}", to);
        logger.info("Reset URL: {}", resetUrl);
        logger.info("========================================");

        String subject = "Reset Your Password - ExpenseTracker";

        String htmlContent = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #16a34a; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">ExpenseTracker</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                    <h2 style="color: #111827;">Hi %s,</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                        We received a request to reset your password. Click the button below to create a new password.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="%s" style="background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                        This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                    <p style="color: #9ca3af; font-size: 12px;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="%s" style="color: #16a34a;">%s</a>
                    </p>
                </div>
            </div>
            """.formatted(name, resetUrl, resetUrl, resetUrl);

        try {
            sendHtmlEmail(to, subject, htmlContent);
            logger.info("Password reset email sent successfully to {}", to);
        } catch (Exception e) {
            logger.warn("Failed to send password reset email to {}: {}. Use the logged URL above to reset manually.", to, e.getMessage());
        }
    }

    private void sendHtmlEmail(String to, String subject, String htmlContent) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);
        mailSender.send(message);
    }
}
