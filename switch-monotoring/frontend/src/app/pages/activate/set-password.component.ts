import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiBaseUrl;

type PageState = 'loading' | 'valid' | 'invalid' | 'success';
type PageMode  = 'activate' | 'reset';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-background flex items-center justify-center px-4">
      <div class="w-full max-w-sm">

        <!-- En-tête -->
        <div class="mb-8 text-center">
          <div class="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-4">
            <svg class="h-6 w-6 text-primary" fill="none" stroke="currentColor"
                 stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0
                   01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
            </svg>
          </div>
          <h1 class="text-xl font-bold text-foreground tracking-tight">HPS Switch Monitor</h1>
          <p class="text-xs text-muted-foreground mt-1 font-mono">
            {{ mode === 'reset' ? 'Réinitialisation du mot de passe' : 'Activation de votre compte' }}
          </p>
        </div>

        <!-- ── Chargement ── -->
        <ng-container *ngIf="state === 'loading'">
          <div class="bg-card border border-border/60 rounded-xl shadow-lg p-8 flex flex-col items-center gap-4">
            <svg class="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            <p class="text-sm text-muted-foreground">Vérification du lien d'activation…</p>
          </div>
        </ng-container>

        <!-- ── Lien invalide / expiré ── -->
        <ng-container *ngIf="state === 'invalid'">
          <div class="bg-card border border-destructive/40 rounded-xl shadow-lg p-6 space-y-5">
            <div class="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3">
              <svg class="h-5 w-5 text-destructive shrink-0 mt-0.5" fill="none"
                   stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                <p class="text-xs font-bold text-destructive uppercase tracking-wide">Lien invalide</p>
                <p class="text-xs text-muted-foreground mt-1">{{ invalidReason }}</p>
              </div>
            </div>
            <button (click)="goToLogin()"
                    class="w-full rounded-lg px-4 py-2.5 bg-muted/30 border border-border/60
                           text-sm font-semibold text-foreground hover:bg-muted/50 transition-all">
              Retour à la connexion
            </button>
          </div>
        </ng-container>

        <!-- ── Formulaire de définition du mot de passe ── -->
        <ng-container *ngIf="state === 'valid'">
          <div class="bg-card border border-border/60 rounded-xl shadow-lg p-6 space-y-5">

            <!-- Bandeau de bienvenue -->
            <div class="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
              <svg class="h-5 w-5 text-primary shrink-0 mt-0.5" fill="none"
                   stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <p class="text-xs font-bold text-primary uppercase tracking-wide">
                {{ mode === 'reset' ? 'Réinitialisation' : 'Bienvenue !' }}
              </p>
                <p class="text-xs text-muted-foreground mt-1">
                  Bonjour <strong class="text-foreground">{{ firstName }}</strong>,
                  {{ mode === 'reset'
                     ? 'définissez votre nouveau mot de passe.'
                     : 'définissez votre mot de passe pour activer votre compte.' }}
                </p>
                <p class="text-[10px] text-muted-foreground font-mono mt-1">{{ email }}</p>
              </div>
            </div>

            <!-- Erreur -->
            <div *ngIf="errorMsg" role="alert"
                 class="flex items-start gap-2.5 bg-destructive/10 border border-destructive/30
                        text-destructive rounded-lg px-3.5 py-3 text-xs font-medium">
              <svg class="h-4 w-4 shrink-0 mt-0.5" fill="none" stroke="currentColor"
                   stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ errorMsg }}</span>
            </div>

            <form (ngSubmit)="submit()" novalidate class="space-y-4">

              <!-- Nouveau mot de passe -->
              <div class="space-y-1.5">
                <label for="pwd"
                       class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Mot de passe
                </label>
                <div class="relative">
                  <input id="pwd" name="pwd"
                         [type]="showPwd ? 'text' : 'password'"
                         [(ngModel)]="password"
                         required autocomplete="new-password"
                         placeholder="Min. 8 caractères"
                         class="w-full bg-muted/30 border border-border/60 rounded-lg px-3.5 py-2.5 pr-10
                                text-sm text-foreground placeholder:text-muted-foreground/50
                                focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60
                                transition-all"/>
                  <button type="button" (click)="showPwd = !showPwd"
                          class="absolute right-3 top-1/2 -translate-y-1/2
                                 text-muted-foreground hover:text-foreground transition-colors"
                          [attr.aria-label]="showPwd ? 'Masquer' : 'Afficher'">
                    <svg *ngIf="!showPwd" class="h-4 w-4" fill="none" stroke="currentColor"
                         stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542
                           7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    <svg *ngIf="showPwd" class="h-4 w-4" fill="none" stroke="currentColor"
                         stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7
                           a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243
                           M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29
                           M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7
                           a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>
                  </button>
                </div>

                <!-- Indicateur de force -->
                <div class="flex gap-1 mt-1.5">
                  <div *ngFor="let i of [0,1,2,3]"
                       [ngClass]="['h-1 flex-1 rounded-full transition-colors',
                         strength > i ? strengthColor : 'bg-muted/40']"></div>
                </div>
                <p class="text-[10px] text-muted-foreground">{{ strengthLabel }}</p>
              </div>

              <!-- Confirmation -->
              <div class="space-y-1.5">
                <label for="confirm"
                       class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Confirmer le mot de passe
                </label>
                <input id="confirm" name="confirm" type="password"
                       [(ngModel)]="confirmPassword"
                       required autocomplete="new-password"
                       placeholder="Répétez le mot de passe"
                       class="w-full bg-muted/30 border border-border/60 rounded-lg px-3.5 py-2.5
                              text-sm text-foreground placeholder:text-muted-foreground/50
                              focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60
                              transition-all"/>
                <p *ngIf="confirmPassword && password !== confirmPassword"
                   class="text-xs text-destructive">Les mots de passe ne correspondent pas.</p>
              </div>

              <button type="submit" [disabled]="isSubmitting"
                      class="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5
                             bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm
                             disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm">
                <svg *ngIf="isSubmitting" class="h-4 w-4 animate-spin"
                     fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                {{ isSubmitting
                 ? (mode === 'reset' ? 'Réinitialisation…' : 'Activation en cours…')
                 : (mode === 'reset' ? 'Définir mon nouveau mot de passe' : 'Activer mon compte') }}
              </button>
            </form>
          </div>
        </ng-container>

        <!-- ── Succès ── -->
        <ng-container *ngIf="state === 'success'">
          <div class="bg-card border border-success/40 rounded-xl shadow-lg p-6 space-y-5">
            <div class="flex flex-col items-center gap-4 py-2">
              <div class="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center">
                <svg class="h-7 w-7 text-success" fill="none" stroke="currentColor"
                     stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div class="text-center">
                <p class="text-sm font-bold text-foreground">
                  {{ mode === 'reset' ? 'Mot de passe réinitialisé !' : 'Compte activé !' }}
                </p>
                <p class="text-xs text-muted-foreground mt-1.5">
                  {{ mode === 'reset'
                     ? 'Votre mot de passe a été réinitialisé avec succès.'
                     : 'Votre mot de passe a été défini avec succès.' }}
                  Vous pouvez maintenant vous connecter.
                </p>
              </div>
            </div>
            <button (click)="goToLogin()"
                    class="w-full rounded-lg px-4 py-2.5 bg-primary hover:bg-primary/90
                           text-primary-foreground text-sm font-semibold transition-all shadow-sm">
              Se connecter
            </button>
          </div>
        </ng-container>

      </div>
    </div>
  `,
})
export class SetPasswordComponent implements OnInit {

  state: PageState = 'loading';
  invalidReason    = '';
  firstName        = '';
  email            = '';

  password         = '';
  confirmPassword  = '';
  showPwd          = false;
  isSubmitting     = false;
  errorMsg         = '';

  mode: PageMode = 'activate';

  private token = '';

  constructor(
    private readonly route:  ActivatedRoute,
    private readonly router: Router,
    private readonly http:   HttpClient,
  ) {}

  ngOnInit(): void {
    this.mode  = this.router.url.includes('/reset-password/') ? 'reset' : 'activate';
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.state         = 'invalid';
      this.invalidReason = 'Token manquant dans l\'URL.';
      return;
    }
    this.validateToken();
  }

  // ── Indicateur de force du mot de passe ──────────────────────────────────

  get strength(): number {
    const p = this.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8)  s++;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/[0-9]/.test(p) && /[^a-zA-Z0-9]/.test(p)) s++;
    return Math.min(s, 4);
  }

  get strengthColor(): string {
    const colors = ['bg-destructive', 'bg-blue-600', 'bg-yellow-500', 'bg-success'];
    return colors[this.strength - 1] ?? 'bg-muted/40';
  }

  get strengthLabel(): string {
    const labels = ['', 'Faible', 'Moyen', 'Bon', 'Fort'];
    return labels[this.strength] ?? '';
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  validateToken(): void {
    const endpoint = this.mode === 'reset'
      ? `${API_BASE}/auth/reset-token-info/${this.token}`
      : `${API_BASE}/auth/token-info/${this.token}`;
    this.http.get<any>(endpoint).subscribe({
      next: res => {
        if (res.valid) {
          this.firstName = res.firstName;
          this.email     = res.email;
          this.state     = 'valid';
        } else {
          this.state         = 'invalid';
          this.invalidReason = res.reason ?? 'Lien invalide.';
        }
      },
      error: () => {
        this.state         = 'invalid';
        this.invalidReason = 'Impossible de vérifier le lien. Le serveur est peut-être indisponible.';
      },
    });
  }

  submit(): void {
    this.errorMsg = '';

    if (this.password.length < 8) {
      this.errorMsg = 'Le mot de passe doit contenir au moins 8 caractères.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMsg = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.isSubmitting = true;

    const endpoint = this.mode === 'reset'
      ? `${API_BASE}/auth/reset-password`
      : `${API_BASE}/auth/activate`;

    this.http.post<any>(endpoint, {
      token:    this.token,
      password: this.password,
    }).subscribe({
      next: res => {
        if (res.success) {
          this.state = 'success';
        } else {
          this.errorMsg     = res.error ?? (this.mode === 'reset' ? 'Erreur de réinitialisation.' : 'Erreur d\'activation.');
          this.isSubmitting = false;
        }
      },
      error: err => {
        this.errorMsg     = err.error?.error ?? 'Erreur serveur. Veuillez réessayer.';
        this.isSubmitting = false;
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
