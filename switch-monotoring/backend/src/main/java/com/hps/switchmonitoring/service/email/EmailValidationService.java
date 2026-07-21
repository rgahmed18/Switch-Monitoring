package com.hps.switchmonitoring.service.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.naming.NamingException;
import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Hashtable;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Validation d'adresses email en 2 temps : format (regex) puis existence
 * reelle du domaine (lookup DNS des enregistrements MX). Rejette egalement
 * les domaines jetables connus (mailinator, yopmail, etc.) et les domaines
 * de test conventionnels (example.com, test.com).
 *
 * Utilise avant la creation/invitation d'un utilisateur pour eviter de
 * saisir une adresse qui ne pourra jamais recevoir l'email d'activation.
 */
@Service
public class EmailValidationService {

    private static final Logger log = LoggerFactory.getLogger(EmailValidationService.class);

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$"
    );

    // Domaines jetables/temporaires — bloqués définitivement
    private static final Set<String> BLOCKED_DOMAINS = Set.of(
        // Guerrilla Mail
        "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
        "guerrillamail.biz", "guerrillamail.de", "guerrillamail.info",
        "guerrillamailblock.com", "sharklasers.com", "grr.la", "spam4.me",
        // Mailinator
        "mailinator.com",
        // Trashmail / Throwaway
        "throwam.com", "trashmail.com", "trashmail.at", "trashmail.io",
        "trashmail.me", "trashmail.net", "throwablemail.com",
        // Fake / Temp Mail
        "fakeinbox.com", "fakeinbox.net", "tempmail.com", "tempmail.net",
        "temp-mail.org", "temp-mail.io", "tempr.email",
        "mytempemail.com", "tempinbox.com", "20minutemail.com",
        "10minutemail.com", "10minutemail.net", "10minemail.com",
        // Yopmail
        "yopmail.com", "yopmail.fr", "yopmail.pp.ua",
        "cool.fr.nf", "jetable.fr.nf", "nospam.ze.tc", "nomail.xl.cx",
        "mega.zik.dj", "speed.1s.fr", "courriel.fr.nf",
        "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf",
        // Discard / Disposable
        "dispostable.com", "discard.email", "nada.email",
        "mailnull.com", "mailnesia.com",
        // Spamgourmet
        "spamgourmet.com", "spamgourmet.net", "spamgourmet.org",
        // Misc
        "maildrop.cc", "mintemail.com", "mailcatch.com",
        "crazymailing.com", "spamfree24.org", "getairmail.com",
        "filzmail.com", "gowikicampus.com", "spamevader.com",
        "spamex.com", "spamaway.net", "dodgit.com",
        "spamgob.com", "spam.la", "ieatspam.eu", "ieatspam.info",
        "emailsensei.com", "sogetthis.com",
        "spamhereplease.com", "spamthisplease.com",
        "fightallspam.com", "junk1.tk", "mailnew.com",
        "spambob.net", "spambob.org", "tempomail.fr",
        // Domaines test/example — invalides par définition
        "test.com", "example.com", "example.net", "example.org",
        "localhost.com", "invalid.com"
    );

    /**
     * Vérifie le format de l'email, bloque les domaines jetables,
     * puis effectue un lookup DNS (MX puis A) sur le domaine.
     */
    public boolean validate(String email) {
        if (email == null || email.isBlank()) {
            log.warn("[EMAIL-VALID] Input null ou vide");
            return false;
        }

        final String trimmed = email.trim().toLowerCase();

        if (!EMAIL_PATTERN.matcher(trimmed).matches()) {
            log.info("[EMAIL-VALID] Format invalide: '{}'", trimmed);
            return false;
        }

        final String domain = trimmed.substring(trimmed.lastIndexOf('@') + 1);

        if (BLOCKED_DOMAINS.contains(domain)) {
            log.warn("[EMAIL-VALID] Domaine jetable bloqué: '{}'", domain);
            return false;
        }

        return checkDomainExists(domain);
    }

    public boolean isDisposable(String email) {
        if (email == null || !email.contains("@")) return false;
        final String domain = email.trim().toLowerCase().split("@")[1];
        return BLOCKED_DOMAINS.contains(domain);
    }

    private boolean checkDomainExists(String domain) {
        // Vérification primaire : enregistrement MX via JNDI DNS
        try {
            Hashtable<String, String> env = new Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            env.put("com.sun.jndi.dns.timeout.initial", "3000");
            env.put("com.sun.jndi.dns.timeout.retries", "1");

            DirContext ctx = new InitialDirContext(env);
            Attributes attrs = ctx.getAttributes("dns:/" + domain, new String[]{"MX"});
            ctx.close();

            if (attrs.get("MX") != null && attrs.get("MX").size() > 0) {
                log.debug("[EMAIL-VALID] MX record trouvé pour '{}'", domain);
                return true;
            }
        } catch (NamingException ex) {
            log.debug("[EMAIL-VALID] Pas de MX pour '{}', tentative A record: {}", domain, ex.getMessage());
        }

        // Fallback : enregistrement A
        try {
            InetAddress.getByName(domain);
            log.debug("[EMAIL-VALID] A record trouvé pour '{}'", domain);
            return true;
        } catch (UnknownHostException ex) {
            log.info("[EMAIL-VALID] Domaine '{}' non résolu — email rejeté", domain);
            return false;
        }
    }
}
