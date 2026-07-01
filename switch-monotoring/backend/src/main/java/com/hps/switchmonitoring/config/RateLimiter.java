package com.hps.switchmonitoring.config;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiter en mémoire basé sur une fenêtre glissante.
 * Protège les endpoints login et forgot-password contre le brute force.
 *
 * Limites :
 *   - login          : 5 tentatives / 15 minutes par IP
 *   - forgot-password: 3 tentatives / 1 heure par IP
 */
@Component
public class RateLimiter {

    private static final int  LOGIN_MAX_ATTEMPTS     = 5;
    private static final long LOGIN_WINDOW_SECONDS   = 15 * 60L;

    private static final int  FORGOT_MAX_ATTEMPTS    = 3;
    private static final long FORGOT_WINDOW_SECONDS  = 60 * 60L;

    private final Map<String, Bucket> loginBuckets  = new ConcurrentHashMap<>();
    private final Map<String, Bucket> forgotBuckets = new ConcurrentHashMap<>();

    public boolean allowLogin(String ip) {
        return allow(loginBuckets, ip, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_SECONDS);
    }

    public boolean allowForgotPassword(String ip) {
        return allow(forgotBuckets, ip, FORGOT_MAX_ATTEMPTS, FORGOT_WINDOW_SECONDS);
    }

    public void resetLogin(String ip) {
        loginBuckets.remove(ip);
    }

    private boolean allow(Map<String, Bucket> store, String key,
                          int maxAttempts, long windowSeconds) {
        long now = Instant.now().getEpochSecond();
        Bucket bucket = store.compute(key, (k, b) -> {
            if (b == null || now - b.windowStart >= windowSeconds) {
                return new Bucket(now, 1);
            }
            b.count++;
            return b;
        });
        return bucket.count <= maxAttempts;
    }

    private static class Bucket {
        long windowStart;
        int  count;

        Bucket(long windowStart, int count) {
            this.windowStart = windowStart;
            this.count       = count;
        }
    }
}
