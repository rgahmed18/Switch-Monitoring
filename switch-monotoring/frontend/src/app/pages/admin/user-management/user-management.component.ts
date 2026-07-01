import {
  Component, signal, computed, HostListener, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  LucideAngularModule,
  Search, Plus, Pencil, Lock, Unlock, Trash2,
  X, Users, ShieldCheck, Eye, UserCheck, UserX, KeyRound, Mail,
} from 'lucide-angular';
import { AppUser, UserRole, UserStatus } from '../../../models';
import { UserStoreService } from '../../../services/user-store.service';
import { EmailValidationService } from '../../../services/email-validation.service';
import { BankProjectStoreService } from '../../../services/bank-project-store.service';
import { environment } from '../../../../environments/environment';

const API_BASE = environment.apiBaseUrl;

interface ModalForm {
  firstName: string;
  lastName:  string;
  email:     string;
  role:      UserRole;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
})
export class UserManagementComponent implements OnInit {
  readonly SearchIcon    = Search;
  readonly PlusIcon      = Plus;
  readonly PencilIcon    = Pencil;
  readonly LockIcon      = Lock;
  readonly UnlockIcon    = Unlock;
  readonly TrashIcon     = Trash2;
  readonly XIcon         = X;
  readonly UsersIcon     = Users;
  readonly ShieldIcon    = ShieldCheck;
  readonly EyeIcon       = Eye;
  readonly UserCheckIcon = UserCheck;
  readonly UserXIcon     = UserX;
  readonly KeyIcon       = KeyRound;
  readonly MailIcon      = Mail;

  inviting = false;
  saving   = false;

  // Lien d'activation à partager manuellement quand le SMTP n'est pas configuré
  activationLink        = '';
  activationLinkCopied  = false;
  showActivationDialog  = false;

  constructor(
    private readonly userStore:       UserStoreService,
    private readonly emailValidator:  EmailValidationService,
    private readonly http:            HttpClient,
    private readonly bankStore:       BankProjectStoreService,
  ) {}

  get users() { return this.userStore.users; }

  ngOnInit(): void {
    this.userStore.loadFromBackend();
  }

  searchQuery  = signal('');
  showModal    = signal(false);
  editingUser  = signal<AppUser | null>(null);
  deleteTarget = signal<AppUser | null>(null);

  form: ModalForm = { firstName: '', lastName: '', email: '', role: 'USER' };
  formError       = '';

  // Email validation state
  emailValidating = false;
  emailValid: boolean | null = null;
  emailValidMsg = '';

  // Project assignment state
  editProjectCodes = signal<string[]>([]);
  projectSearch    = signal('');

  filteredProjectsForEdit = computed(() => {
    const q = this.projectSearch().toLowerCase().trim();
    return this.bankStore.getAll().filter(p =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.country.toLowerCase().includes(q)
    );
  });

  isProjectSelected(code: string): boolean {
    return this.editProjectCodes().includes(code);
  }

  toggleProjectCode(code: string): void {
    this.editProjectCodes.update(codes =>
      codes.includes(code) ? codes.filter(c => c !== code) : [...codes, code]
    );
  }

  removeProjectCode(code: string): void {
    this.editProjectCodes.update(codes => codes.filter(c => c !== code));
  }

  // Reset password state
  resetTarget     = signal<AppUser | null>(null);
  resetTempPwd    = '';
  resetPwdCopied  = false;

  // Toast notification
  toastMessage = '';
  toastVisible = false;
  private _toastTimer?: ReturnType<typeof setTimeout>;

  // ── Computed ──────────────────────────────────────────────────────────────
  filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.users();
    return this.users().filter(u =>
      (u.firstName + ' ' + u.lastName).toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q),
    );
  });

  totalCount   = computed(() => this.users().length);
  adminCount   = computed(() => this.users().filter(u => u.role === 'ADMIN').length);
  userCount    = computed(() => this.users().filter(u => u.role !== 'ADMIN').length);
  activeCount  = computed(() => this.users().filter(u => u.status === 'ACTIVE').length);
  blockedCount = computed(() => this.users().filter(u => u.status === 'BLOCKED').length);

  // ── Modal ─────────────────────────────────────────────────────────────────
  openCreate(): void {
    this.editingUser.set(null);
    this.form = { firstName: '', lastName: '', email: '', role: 'USER' };
    this.formError       = '';
    this.emailValid      = null;
    this.emailValidMsg   = '';
    this.emailValidating = false;
    this.editProjectCodes.set([]);
    this.projectSearch.set('');
    this.showModal.set(true);
  }

  openEdit(user: AppUser): void {
    this.editingUser.set(user);
    this.form = {
      firstName: user.firstName,
      lastName:  user.lastName,
      email:     user.email,
      role:      user.role,
    };
    this.formError       = '';
    this.emailValid      = null;
    this.emailValidMsg   = '';
    this.emailValidating = false;
    this.editProjectCodes.set([...(user.projects ?? [])]);
    this.projectSearch.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.emailValid      = null;
    this.emailValidMsg   = '';
    this.emailValidating = false;
    this.editProjectCodes.set([]);
    this.projectSearch.set('');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeModal();
    this.deleteTarget.set(null);
    this.resetTarget.set(null);
  }

  // ── Email validation on blur ───────────────────────────────────────────────
  onEmailBlur(): void {
    const email = this.form.email.trim();
    if (!email) { this.emailValid = null; this.emailValidMsg = ''; return; }

    if (!this.emailValidator.validateFormat(email)) {
      this.emailValid    = false;
      this.emailValidMsg = 'Format d\'email invalide.';
      return;
    }

    this.emailValidating = true;
    this.emailValid      = null;
    this.emailValidMsg   = '';

    this.emailValidator.validateDomain(email).subscribe({
      next: result => {
        this.emailValidating = false;
        this.emailValid      = result.valid;
        this.emailValidMsg   = result.valid
          ? (result.reason ?? 'Adresse email valide.')
          : (result.reason ?? 'Domaine email invalide ou inexistant.');
      },
      error: () => {
        this.emailValidating = false;
        this.emailValid      = true;
        this.emailValidMsg   = 'Validation DNS indisponible  -  format verifie uniquement.';
      },
    });
  }

  saveUser(): void {
    this.formError = '';

    if (!this.form.firstName.trim() || !this.form.lastName.trim() || !this.form.email.trim()) {
      this.formError = 'Tous les champs sont obligatoires.';
      return;
    }

    if (this.emailValidating) {
      this.formError = 'Validation de l\'email en cours, veuillez patienter.';
      return;
    }

    if (!this.emailValidator.validateFormat(this.form.email)) {
      this.formError = 'Adresse email invalide.';
      return;
    }

    if (this.emailValid === false) {
      this.formError = this.emailValidMsg || 'Email invalide  -  creation bloquee.';
      return;
    }

    const editing = this.editingUser();

    if (editing) {
      this.saving = true;
      this.http.put<any>(`${API_BASE}/admin/users/${editing.id}`, {
        firstName: this.form.firstName.trim(),
        lastName:  this.form.lastName.trim(),
        role:      this.form.role,
        projects:  this.editProjectCodes().join(','),
      }).subscribe({
        next: () => {
          this.saving = false;
          this.userStore.loadFromBackend();
          this.closeModal();
          this.showToast(`Compte de ${this.form.firstName} ${this.form.lastName} mis à jour.`);
        },
        error: () => {
          this.saving = false;
          // Fallback local si backend indisponible
          this.users.update(list =>
            list.map(u =>
              u.id !== editing.id ? u : {
                ...u,
                firstName: this.form.firstName.trim(),
                lastName:  this.form.lastName.trim(),
                role:      this.form.role,
              },
            ),
          );
          this.closeModal();
          this.showToast(`Compte de ${this.form.firstName} ${this.form.lastName} mis à jour.`);
        },
      });
    } else {
      // Nouvelle invitation → appel backend pour créer le compte + envoyer l'email
      this.inviting = true;
      this.http.post<any>(`${API_BASE}/admin/invite`, {
        email:     this.form.email.trim(),
        firstName: this.form.firstName.trim(),
        lastName:  this.form.lastName.trim(),
        role:      this.form.role,
        projects:  this.editProjectCodes().join(','),
      }).subscribe({
        next: res => {
          this.inviting = false;
          if (res.success) {
            this.userStore.loadFromBackend();
            this.closeModal();
            if (res.emailSent) {
              // Email envoyé automatiquement → simple toast
              this.showToast(`Email d'invitation envoyé à ${res.email}.`);
            } else if (res.activationLink) {
              // SMTP absent → afficher le lien pour partage manuel
              this.activationLink       = res.activationLink;
              this.activationLinkCopied = false;
              this.showActivationDialog = true;
            } else {
              this.showToast(`Utilisateur ${this.form.firstName.trim()} créé.`);
            }
          } else {
            this.formError = res.error ?? 'Erreur lors de la création du compte.';
          }
        },
        error: err => {
          this.inviting = false;
          // Backend inaccessible (status 0) → création locale (mode sans backend)
          if (!err.status || err.status === 0) {
            const pendingUser: AppUser = {
              id:        Date.now(),
              username:  this.form.email.split('@')[0],
              firstName: this.form.firstName.trim(),
              lastName:  this.form.lastName.trim(),
              email:     this.form.email.trim(),
              role:      this.form.role,
              projects:  [],
              status:    'ACTIVE',
              createdAt: new Date().toISOString().split('T')[0],
            };
            this.users.update(list => [...list, pendingUser]);
            this.closeModal();
            this.showToast(`Utilisateur ${pendingUser.firstName} ${pendingUser.lastName} créé.`);
          } else {
            this.formError = err.error?.error ?? 'Erreur serveur. Vérifiez que le backend est démarré.';
          }
        },
      });
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  toggleStatus(user: AppUser): void {
    this.http.patch<any>(`${API_BASE}/admin/users/${user.id}/status`, {}).subscribe({
      next: () => {
        this.userStore.loadFromBackend();
        const label = user.status === 'ACTIVE' ? 'bloqué' : 'réactivé';
        this.showToast(`${user.firstName} ${user.lastName} ${label}.`);
      },
      error: () => {
        // Fallback local si backend indisponible
        this.users.update(list =>
          list.map(u =>
            u.id === user.id
              ? { ...u, status: u.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE' as UserStatus }
              : u,
          ),
        );
        const label = user.status === 'ACTIVE' ? 'bloqué' : 'réactivé';
        this.showToast(`${user.firstName} ${user.lastName} ${label}.`);
      },
    });
  }

  confirmDelete(user: AppUser): void {
    this.deleteTarget.set(user);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  executeDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.http.delete<any>(`${API_BASE}/admin/users/${target.id}`).subscribe({
      next: () => {
        this.userStore.loadFromBackend();
        this.deleteTarget.set(null);
        this.showToast(`Utilisateur ${target.firstName} ${target.lastName} supprimé.`);
      },
      error: () => {
        // Fallback local si backend indisponible
        this.users.update(list => list.filter(u => u.id !== target.id));
        this.deleteTarget.set(null);
        this.showToast(`Utilisateur ${target.firstName} ${target.lastName} supprimé.`);
      },
    });
  }

  // ── Reset password (admin action) ─────────────────────────────────────────
  openResetPassword(user: AppUser): void {
    this.resetTarget.set(user);
    this.resetTempPwd   = '';
    this.resetPwdCopied = false;
  }

  confirmResetPassword(): void {
    const target = this.resetTarget();
    if (!target) return;
    this.http.post<any>(`${API_BASE}/admin/users/${target.id}/reset-password`, {}).subscribe({
      next: res => {
        if (res.emailSent) {
          this.showToast(`Email de réinitialisation envoyé à ${target.email}.`);
          this.closeResetModal();
        } else {
          // SMTP absent : afficher le lien pour partage manuel
          this.resetTempPwd = res.resetLink;
        }
      },
      error: () => {
        // Fallback local si backend indisponible
        const { tempPassword } = this.userStore.resetUserPassword(target.id);
        this.resetTempPwd = tempPassword;
      },
    });
  }

  copyTempPassword(): void {
    navigator.clipboard.writeText(this.resetTempPwd).then(() => {
      this.resetPwdCopied = true;
    }).catch(() => {
      this.resetPwdCopied = true;
    });
  }

  closeResetModal(): void {
    if (this.resetTempPwd) {
      const target = this.resetTarget();
      if (target) {
        this.showToast(`Réinitialisation envoyée pour ${target.email}. L'utilisateur doit définir un nouveau mot de passe.`);
      }
    }
    this.resetTarget.set(null);
    this.resetTempPwd   = '';
    this.resetPwdCopied = false;
  }

  copyActivationLink(): void {
    navigator.clipboard.writeText(this.activationLink).then(() => {
      this.activationLinkCopied = true;
    }).catch(() => {
      this.activationLinkCopied = true;
    });
  }

  closeActivationDialog(): void {
    this.showActivationDialog = false;
    this.activationLink       = '';
    this.activationLinkCopied = false;
    this.showToast('Utilisateur créé. Partagez le lien d\'activation avec lui.');
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  private showToast(message: string): void {
    clearTimeout(this._toastTimer);
    this.toastMessage = message;
    this.toastVisible = true;
    this._toastTimer  = setTimeout(() => { this.toastVisible = false; }, 4000);
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  fullName(u: AppUser): string {
    return u.firstName + ' ' + u.lastName;
  }

  initials(u: AppUser): string {
    return (u.firstName[0] + u.lastName[0]).toUpperCase();
  }

  roleBadge(role: UserRole): string {
    return role === 'ADMIN'
      ? 'bg-red-500/10 text-red-400 border border-red-500/30'
      : 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
  }

  roleLabel(role: UserRole): string {
    return role === 'ADMIN' ? 'Administrateur' : 'Utilisateur';
  }

  avatarColor(role: UserRole): string {
    return role === 'ADMIN'
      ? 'bg-red-500/20 text-red-400'
      : 'bg-blue-500/20 text-blue-400';
  }

  statusBadge(status: UserStatus): string {
    return status === 'ACTIVE'
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
      : 'bg-slate-500/10 text-slate-400 border border-slate-500/30';
  }

  statusLabel(status: UserStatus): string {
    return status === 'ACTIVE' ? 'Actif' : 'Bloqué';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  }

  roles: UserRole[] = ['ADMIN', 'USER'];
}
