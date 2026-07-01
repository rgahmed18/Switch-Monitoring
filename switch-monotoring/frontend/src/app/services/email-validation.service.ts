import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

const API_BASE = `${environment.apiBaseUrl}/admin`;

// Strict RFC-5322-inspired pattern: local@domain.tld
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// Known disposable or clearly invalid domain patterns (non-exhaustive safeguard)
const BLOCKED_DOMAINS = new Set([
  'test.com', 'example.com', 'mailinator.com', 'guerrillamail.com',
  'throwam.com', 'trashmail.com', 'fakeinbox.com', 'yopmail.com',
]);

@Injectable({ providedIn: 'root' })
export class EmailValidationService {
  constructor(private readonly http: HttpClient) {}

  validateFormat(email: string): boolean {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(trimmed)) return false;
    const domain = trimmed.split('@')[1];
    if (BLOCKED_DOMAINS.has(domain)) return false;
    // Domain must have at least one valid label before the TLD
    const parts = domain.split('.');
    if (parts.length < 2) return false;
    if (parts.some(p => p.length === 0)) return false;
    return true;
  }

  // Calls the backend MX/DNS check; falls back to format-only if backend unreachable.
  validateDomain(email: string): Observable<{ valid: boolean; reason?: string }> {
    if (!this.validateFormat(email)) {
      return of({ valid: false, reason: 'Format d\'email invalide.' });
    }
    return this.http
      .get<{ valid: boolean; reason?: string }>(
        `${API_BASE}/validate-email`,
        { params: { email: email.trim() } },
      )
      .pipe(
        timeout(5000),
        catchError(() => {
          // Backend unavailable  -  degrade gracefully to format-only check
          return of({ valid: true, reason: 'Validation DNS indisponible  -  format verifie uniquement.' });
        }),
        map(res => res),
      );
  }
}
