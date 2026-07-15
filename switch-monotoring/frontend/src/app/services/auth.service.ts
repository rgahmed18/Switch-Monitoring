import { Injectable, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, firstValueFrom } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AppUser, LoginCredentials } from '../models';
import { ProjectFilterService } from './project-filter.service';
import { environment } from '../../environments/environment';

const API_BASE     = environment.apiBaseUrl;
const STORAGE_KEY  = 'switch_monitor_user';
const LOGOUT_EVENT = 'switch_monitor_logout_broadcast';

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly _currentUser = signal<AppUser | null>(this.restoreSession());
  private readonly _onStorageEvent: (e: StorageEvent) => void;

  readonly currentUser = this._currentUser.asReadonly();

  constructor(
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly projectFilter: ProjectFilterService,
  ) {
    // Synchronize logout across all open browser tabs via localStorage events.
    // sessionStorage is cleared automatically when the tab or browser is closed,
    // enforcing re-authentication on every new session.
    this._onStorageEvent = (e: StorageEvent) => {
      if (e.key === LOGOUT_EVENT && e.newValue) {
        sessionStorage.removeItem(STORAGE_KEY);
        this._currentUser.set(null);
        this.router.navigate(['/login']);
      }
    };
    window.addEventListener('storage', this._onStorageEvent);
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this._onStorageEvent);
  }

  login(credentials: LoginCredentials): Observable<AppUser> {
    return this.http
      .post<AppUser>(`${API_BASE}/auth/login`, credentials)
      .pipe(
        tap(user => { this.projectFilter.clearProject(); this.persistSession(user); }),
        catchError((err) => {
          const msg: string = err.error?.error ?? 'Identifiants incorrects.';
          return throwError(() => new Error(msg));
        }),
      );
  }

  logout(): void {
    this.projectFilter.clearProject();
    sessionStorage.removeItem(STORAGE_KEY);
    this._currentUser.set(null);
    // Broadcast logout to all other open tabs via localStorage event.
    localStorage.setItem(LOGOUT_EVENT, Date.now().toString());
    localStorage.removeItem(LOGOUT_EVENT);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this._currentUser() !== null;
  }

  isAdmin(): boolean {
    return this._currentUser()?.role === 'ADMIN';
  }

  getRole(): AppUser['role'] | undefined {
    return this._currentUser()?.role;
  }

  mustChangePassword(): boolean {
    return this._currentUser()?.mustChangePassword === true;
  }

  completePasswordChange(): void {
    const user = this._currentUser();
    if (!user) return;
    const updated: AppUser = { ...user, mustChangePassword: false };
    this.persistSession(updated);
  }

  /**
   * Recharge les donnees de l'utilisateur courant depuis le backend (GET /auth/me),
   * notamment ses projets assignes. Accessible a tout role (contrairement a
   * /admin/users) : utile pour qu'un utilisateur non-admin voie immediatement
   * une reassignation de projets faite par un administrateur, sans se
   * reconnecter.
   */
  async refreshCurrentUser(): Promise<void> {
    const current = this._currentUser();
    if (!current) return;
    try {
      const fresh = await firstValueFrom(this.http.get<AppUser>(`${API_BASE}/auth/me`));
      this.persistSession(fresh);
    } catch {
      // Silencieux : on garde les donnees de session existantes en cas d'erreur reseau.
    }
  }

  private persistSession(user: AppUser): void {
    const { _password, ...safeUser } = user as AppUser & { _password?: string };
    // Backend may return projects as a comma-separated string  -  always normalize to string[]
    const rawProjects = (safeUser as any).projects;
    if (typeof rawProjects === 'string') {
      safeUser.projects = rawProjects.split(',').map((p: string) => p.trim()).filter(Boolean);
    } else if (!Array.isArray(rawProjects)) {
      safeUser.projects = [];
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser));
    this._currentUser.set(safeUser as AppUser);
  }

  private restoreSession(): AppUser | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AppUser) : null;
    } catch {
      return null;
    }
  }

}
