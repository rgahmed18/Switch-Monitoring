package com.hps.switchmonitoring.service.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Envoi des emails transactionnels de l'application (invitation, activation,
 * reinitialisation de mot de passe) via JavaMailSender.
 *
 * L'injection de {@code mailSender} est optionnelle ({@code @Autowired(required = false)}) :
 * si aucun serveur SMTP n'est configure (propriete {@code spring.mail.host} absente),
 * ce service reste inactif et les appelants (UserService) affichent le lien
 * d'activation/reinitialisation directement dans l'interface a la place.
 */
@Service
public class EmailSenderService {

    private static final Logger log = LoggerFactory.getLogger(EmailSenderService.class);

    // Injecté seulement si spring.mail.host est défini dans application.yml
    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromAddress;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    /**
     * Envoie l'email d'invitation contenant le lien d'activation.
     * Si le serveur SMTP n'est pas configuré, le lien est loggué en console
     * pour permettre les tests sans infrastructure mail.
     */
    /**
     * @return true si l'email a été envoyé avec succès, false sinon (SMTP absent ou erreur).
     */
    public boolean sendActivationEmail(String toEmail, String firstName, String token) {
        final String activationLink = frontendUrl + "/activate/" + token;
        log.info("[MAIL] Envoi du lien d'activation à {}", toEmail);

        if (mailSender == null) {
            log.warn("[MAIL] JavaMailSender non configuré — définissez spring.mail.* dans application.yml.");
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject("Activation de votre compte HPS Switch Monitor");
            helper.setText(buildHtml(firstName, activationLink), true);
            mailSender.send(message);
            log.info("[MAIL] Email d'activation envoyé avec succès à : {}", toEmail);
            return true;
        } catch (Exception e) {
            log.error("[MAIL] Échec d'envoi vers {} : {}", toEmail, e.getMessage());
            return false;
        }
    }

    private String buildHtml(String firstName, String link) {
        return "<html><body style=\"font-family:Arial,sans-serif;background:#0d1117;color:#c9d1d9;padding:40px;margin:0\">"
            + "<div style=\"max-width:560px;margin:0 auto;background:#161b22;"
            + "border:1px solid #30363d;border-radius:12px;padding:32px\">"
            + "<div style=\"display:flex;align-items:center;gap:10px;margin-bottom:4px\">"
            + "<span style=\"font-size:20px;font-weight:bold;color:#58a6ff\">HPS Switch Monitor</span>"
            + "</div>"
            + "<p style=\"color:#8b949e;font-size:11px;margin-top:0;margin-bottom:24px\">"
            + "Plateforme de supervision ISO 8583</p>"
            + "<hr style=\"border:none;border-top:1px solid #30363d;margin-bottom:24px\">"
            + "<p style=\"margin:0 0 12px\">Bonjour <strong>" + escapeHtml(firstName) + "</strong>,</p>"
            + "<p style=\"margin:0 0 16px\">Un administrateur vient de vous créer un compte sur la "
            + "plateforme <strong>HPS Switch Monitor</strong>.</p>"
            + "<p style=\"margin:0 0 28px\">Cliquez sur le bouton ci-dessous pour définir votre mot "
            + "de passe et activer votre compte :</p>"
            + "<div style=\"text-align:center;margin-bottom:28px\">"
            + "<a href=\"" + link + "\" style=\"background:#238636;color:#ffffff;"
            + "padding:13px 32px;border-radius:8px;text-decoration:none;"
            + "font-weight:bold;font-size:14px;display:inline-block\">"
            + "Activer mon compte</a></div>"
            + "<p style=\"color:#8b949e;font-size:12px;margin:0 0 8px\">"
            + "Ce lien est valable <strong>48 heures</strong>. "
            + "Après expiration, contactez votre administrateur.</p>"
            + "<p style=\"color:#8b949e;font-size:12px;margin:0\">"
            + "Si vous n'attendiez pas ce message, ignorez cet email.</p>"
            + "</div></body></html>";
    }

    public void sendPasswordResetEmail(String toEmail, String firstName, String token) {
        final String resetLink = frontendUrl + "/reset-password/" + token;
        log.info("[MAIL] Envoi du lien de réinitialisation à {}", toEmail);

        if (mailSender == null) {
            log.warn("[MAIL] JavaMailSender non configuré — définissez spring.mail.* dans application.yml.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject("Réinitialisation de votre mot de passe HPS Switch Monitor");
            helper.setText(buildResetHtml(firstName, resetLink), true);
            mailSender.send(message);
            log.info("[MAIL] Email de réinitialisation envoyé à : {}", toEmail);
        } catch (MessagingException e) {
            log.error("[MAIL] Échec d'envoi reset vers {} : {}", toEmail, e.getMessage());
        }
    }

    private String buildResetHtml(String firstName, String link) {
        return "<html><body style=\"font-family:Arial,sans-serif;background:#0d1117;color:#c9d1d9;padding:40px;margin:0\">"
            + "<div style=\"max-width:560px;margin:0 auto;background:#161b22;"
            + "border:1px solid #30363d;border-radius:12px;padding:32px\">"
            + "<span style=\"font-size:20px;font-weight:bold;color:#58a6ff\">HPS Switch Monitor</span>"
            + "<p style=\"color:#8b949e;font-size:11px;margin-top:4px;margin-bottom:24px\">"
            + "Plateforme de supervision ISO 8583</p>"
            + "<hr style=\"border:none;border-top:1px solid #30363d;margin-bottom:24px\">"
            + "<p>Bonjour <strong>" + escapeHtml(firstName) + "</strong>,</p>"
            + "<p>Nous avons reçu une demande de réinitialisation du mot de passe pour votre compte.</p>"
            + "<p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>"
            + "<div style=\"text-align:center;margin:28px 0\">"
            + "<a href=\"" + link + "\" style=\"background:#1f6feb;color:#ffffff;"
            + "padding:13px 32px;border-radius:8px;text-decoration:none;"
            + "font-weight:bold;font-size:14px;display:inline-block\">"
            + "Réinitialiser mon mot de passe</a></div>"
            + "<p style=\"color:#8b949e;font-size:12px;margin:0 0 8px\">"
            + "Ce lien est valable <strong>1 heure</strong>.</p>"
            + "<p style=\"color:#8b949e;font-size:12px;margin:0\">"
            + "Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>"
            + "</div></body></html>";
    }

    private String escapeHtml(String input) {
        return input == null ? "" : input
            .replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace("\"", "&quot;");
    }
}
