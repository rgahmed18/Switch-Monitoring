import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { LoginCredentials } from '../../models';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiBaseUrl;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-background flex items-center justify-center px-4">
      <div class="w-full max-w-sm">

        <!-- En-tete -->
        <div class="mb-8 text-center">
          <div class="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-4">
            <svg class="h-6 w-6 text-primary" fill="none" stroke="currentColor" stroke-width="2"
                 viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0
                   01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622
                   5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <h1 class="text-xl font-bold text-foreground tracking-tight">HPS Switch Monitor</h1>
          <p class="text-xs text-muted-foreground mt-1 font-mono">Plateforme de supervision ISO 8583</p>
        </div>

        <!-- ================================================================
             FORMULAIRE DE CONNEXION NORMAL
             ================================================================ -->
        <ng-container *ngIf="!mustChangePwd">
          <div class="bg-card border border-border/60 rounded-xl shadow-lg p-6 space-y-5">

            <div>
              <h2 class="text-base font-semibold text-foreground">Connexion</h2>
              <p class="text-xs text-muted-foreground mt-0.5">Acces reserve au personnel autorise</p>
            </div>

            <!-- Banniere d'erreur -->
            <div *ngIf="errorMessage" role="alert"
                 class="flex items-start gap-2.5 bg-destructive/10 border border-destructive/30
                        text-destructive rounded-lg px-3.5 py-3 text-xs font-medium">
              <svg class="h-4 w-4 shrink-0 mt-0.5" fill="none" stroke="currentColor"
                   stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ errorMessage }}</span>
            </div>

            <!-- Formulaire -->
            <form (ngSubmit)="onSubmit()" novalidate class="space-y-4">

              <!-- Nom d'utilisateur -->
              <div class="space-y-1.5">
                <label for="username"
                       class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Nom d'utilisateur
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  [(ngModel)]="credentials.username"
                  required
                  autocomplete="username"
                  placeholder="Ex: admin"
                  (blur)="usernameTouched = true"
                  [ngClass]="[
                    'w-full bg-muted/30 border rounded-lg px-3.5 py-2.5 text-sm text-foreground',
                    'placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2',
                    'focus:ring-primary/40 focus:border-primary/60 transition-all',
                    usernameInvalid ? 'border-destructive/60' : 'border-border/60'
                  ]"
                />
                <p *ngIf="usernameInvalid" class="text-xs text-destructive">Ce champ est requis.</p>
              </div>

              <!-- Mot de passe -->
              <div class="space-y-1.5">
                <label for="password"
                       class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Mot de passe
                </label>
                <div class="relative">
                  <input
                    id="password"
                    name="password"
                    [type]="showPassword ? 'text' : 'password'"
                    [(ngModel)]="credentials.password"
                    required
                    autocomplete="current-password"
                    placeholder="Mot de passe"
                    (blur)="passwordTouched = true"
                    [ngClass]="[
                      'w-full bg-muted/30 border rounded-lg px-3.5 py-2.5 pr-10 text-sm text-foreground',
                      'placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2',
                      'focus:ring-primary/40 focus:border-primary/60 transition-all',
                      passwordInvalid ? 'border-destructive/60' : 'border-border/60'
                    ]"
                  />
                  <button
                    type="button"
                    (click)="showPassword = !showPassword"
                    [attr.aria-label]="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                    class="absolute right-3 top-1/2 -translate-y-1/2
                           text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg *ngIf="!showPassword" class="h-4 w-4" fill="none"
                         stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7
                           -1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    <svg *ngIf="showPassword" class="h-4 w-4" fill="none"
                         stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7
                           a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243
                           M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29
                           M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7
                           a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>
                  </button>
                </div>
                <p *ngIf="passwordInvalid" class="text-xs text-destructive">Ce champ est requis.</p>
              </div>

              <!-- Bouton de soumission -->
              <button
                type="submit"
                [disabled]="isLoading"
                class="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5
                       bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm
                       disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
              >
                <svg *ngIf="isLoading" class="h-4 w-4 animate-spin"
                     fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                {{ isLoading ? 'Connexion en cours...' : 'Se connecter' }}
              </button>
            </form>

            <!-- Lien mot de passe oublie -->
            <div class="text-center pt-1">
              <button
                type="button"
                (click)="toggleForgot()"
                class="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2">
                Mot de passe oublie ?
              </button>
            </div>

            <!-- Formulaire mot de passe oublie -->
            <div *ngIf="showForgotForm"
                 class="rounded-lg bg-muted/20 border border-border/40 px-4 py-3 space-y-3">

              <!-- Titre -->
              <p class="text-xs font-semibold text-foreground">Reinitialisation du mot de passe</p>

              <!-- Succes -->
              <div *ngIf="forgotSent"
                   class="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30
                          text-emerald-400 rounded-lg px-3 py-2 text-xs">
                <svg class="h-4 w-4 shrink-0 mt-0.5" fill="none" stroke="currentColor"
                     stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
                <span>Si cette adresse est connue, un lien de reinitialisation a ete envoye.</span>
              </div>

              <!-- Erreur -->
              <div *ngIf="forgotError"
                   class="text-xs text-destructive bg-destructive/10 border border-destructive/30
                          rounded-lg px-3 py-2">{{ forgotError }}</div>

              <!-- Champ email + bouton -->
              <div *ngIf="!forgotSent" class="flex gap-2">
                <input
                  type="email"
                  [(ngModel)]="forgotEmail"
                  name="forgotEmail"
                  placeholder="Votre adresse email"
                  class="flex-1 bg-muted/30 border border-border/60 rounded-lg px-3 py-2
                         text-xs text-foreground placeholder:text-muted-foreground/50
                         focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60
                         transition-all"/>
                <button
                  type="button"
                  (click)="sendForgotPassword()"
                  [disabled]="forgotSending"
                  class="shrink-0 rounded-lg px-3 py-2 bg-primary hover:bg-primary/90
                         text-primary-foreground text-xs font-semibold transition-all
                         disabled:opacity-60 disabled:cursor-not-allowed">
                  <svg *ngIf="forgotSending" class="h-3.5 w-3.5 animate-spin"
                       fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10"
                            stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  <span *ngIf="!forgotSending">Envoyer</span>
                </button>
              </div>
            </div>

          </div>

        </ng-container>

        <!-- ================================================================
             MODAL CHANGEMENT DE MOT DE PASSE FORCE
             Affiche quand l'utilisateur se connecte avec un mot de passe
             temporaire marque mustChangePassword=true
             ================================================================ -->
        <ng-container *ngIf="mustChangePwd">
          <div class="bg-card border border-amber-500/40 rounded-xl shadow-lg p-6 space-y-5">

            <!-- Bandeau avertissement -->
            <div class="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30
                        rounded-lg px-4 py-3">
              <svg class="h-5 w-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor"
                   stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
              <div>
                <p class="text-xs font-bold text-amber-500 uppercase tracking-wide">
                  Changement de mot de passe requis
                </p>
                <p class="text-xs text-muted-foreground mt-1">
                  Votre mot de passe est temporaire. Vous devez le modifier avant de continuer.
                </p>
              </div>
            </div>

            <!-- Erreur changement -->
            <div *ngIf="changeError" role="alert"
                 class="flex items-start gap-2.5 bg-destructive/10 border border-destructive/30
                        text-destructive rounded-lg px-3.5 py-3 text-xs font-medium">
              <span>{{ changeError }}</span>
            </div>

            <form (ngSubmit)="onChangePassword()" novalidate class="space-y-4">

              <!-- Nouveau mot de passe -->
              <div class="space-y-1.5">
                <label for="new-password"
                       class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Nouveau mot de passe
                </label>
                <div class="relative">
                  <input
                    id="new-password"
                    name="new-password"
                    [type]="showNewPwd ? 'text' : 'password'"
                    [(ngModel)]="newPassword"
                    required
                    autocomplete="new-password"
                    placeholder="Min. 8 caracteres"
                    class="w-full bg-muted/30 border border-border/60 rounded-lg px-3.5 py-2.5 pr-10
                           text-sm text-foreground placeholder:text-muted-foreground/50
                           focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60
                           transition-all"
                  />
                  <button type="button" (click)="showNewPwd = !showNewPwd"
                          class="absolute right-3 top-1/2 -translate-y-1/2
                                 text-muted-foreground hover:text-foreground transition-colors">
                    <svg *ngIf="!showNewPwd" class="h-4 w-4" fill="none" stroke="currentColor"
                         stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542
                           7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    <svg *ngIf="showNewPwd" class="h-4 w-4" fill="none" stroke="currentColor"
                         stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M3 3l18 18M10.477 10.477A3 3 0 0013.523 13.523M6.228 6.228
                           A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0
                           01-4.132 5.411m-4.132-5.411A9.97 9.97 0 012.458 12"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Confirmation -->
              <div class="space-y-1.5">
                <label for="confirm-password"
                       class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  [(ngModel)]="confirmPassword"
                  required
                  autocomplete="new-password"
                  placeholder="Repetez le mot de passe"
                  class="w-full bg-muted/30 border border-border/60 rounded-lg px-3.5 py-2.5
                         text-sm text-foreground placeholder:text-muted-foreground/50
                         focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60
                         transition-all"
                />
              </div>

              <button
                type="submit"
                class="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5
                       bg-amber-500 hover:bg-amber-600 text-black font-semibold text-sm
                       transition-all shadow-sm hover:shadow-md"
              >
                Definir mon nouveau mot de passe
              </button>
            </form>
          </div>
        </ng-container>

      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  credentials: LoginCredentials = { username: '', password: '' };

  errorMessage    = '';
  isLoading       = false;
  showPassword    = false;
  showForgotForm  = false;
  usernameTouched = false;
  passwordTouched = false;

  // Forgot password state
  forgotEmail   = '';
  forgotSending = false;
  forgotSent    = false;
  forgotError   = '';

  // Forced password change state
  mustChangePwd   = false;
  newPassword     = '';
  confirmPassword = '';
  showNewPwd      = false;
  changeError     = '';

  get usernameInvalid(): boolean {
    return this.usernameTouched && !this.credentials.username.trim();
  }

  get passwordInvalid(): boolean {
    return this.passwordTouched && !this.credentials.password.trim();
  }

  constructor(
    private readonly auth:   AuthService,
    private readonly router: Router,
    private readonly http:   HttpClient,
  ) {}

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/']);
    }
  }

  onSubmit(): void {
    this.usernameTouched = true;
    this.passwordTouched = true;

    if (!this.credentials.username.trim() || !this.credentials.password.trim()) {
      return;
    }

    this.isLoading    = true;
    this.errorMessage = '';

    this.auth.login(this.credentials).subscribe({
      next: () => {
        this.isLoading = false;
        if (this.auth.mustChangePassword()) {
          this.mustChangePwd = true;
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err: Error) => {
        this.errorMessage = err.message;
        this.isLoading    = false;
      },
    });
  }

  toggleForgot(): void {
    this.showForgotForm = !this.showForgotForm;
    this.forgotEmail    = '';
    this.forgotSent     = false;
    this.forgotError    = '';
  }

  sendForgotPassword(): void {
    this.forgotError = '';
    if (!this.forgotEmail.trim()) {
      this.forgotError = 'Veuillez saisir votre adresse email.';
      return;
    }
    this.forgotSending = true;
    this.http.post<any>(`${API_BASE}/auth/forgot-password`, { email: this.forgotEmail.trim() })
      .subscribe({
        next: () => {
          this.forgotSending = false;
          this.forgotSent    = true;
        },
        error: () => {
          this.forgotSending = false;
          this.forgotSent    = true; // Always show success to prevent email enumeration
        },
      });
  }

  onChangePassword(): void {
    this.changeError = '';

    if (!this.newPassword.trim()) {
      this.changeError = 'Le nouveau mot de passe est obligatoire.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.changeError = 'Le mot de passe doit contenir au moins 8 caracteres.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.changeError = 'Les deux mots de passe ne correspondent pas.';
      return;
    }

    this.auth.completePasswordChange();
    this.router.navigate(['/']);
  }
}
