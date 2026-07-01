import {
  Component, signal, computed, HostListener, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  LucideAngularModule,
  Search, Plus, Pencil, Trash2, X,
  Building2, Globe, ToggleLeft, ToggleRight,
  Users, ShieldCheck,
} from 'lucide-angular';
import { BankProject, BankType, BankStatus, AppUser } from '../../../models';
import { UserStoreService } from '../../../services/user-store.service';
import { BankProjectStoreService } from '../../../services/bank-project-store.service';
import { environment } from '../../../../environments/environment';

const COUNTRIES = [
  // Afrique
  'Maroc', 'Tunisie', 'Sénégal', "Côte d'Ivoire",
  'Afrique du Sud', 'Nigeria', 'Égypte',
  // Europe
  'France', 'Royaume-Uni', 'Espagne', 'Allemagne', 'Grèce',
  'Belgique', 'Italie', 'Portugal', 'Pays-Bas', 'Suisse',
  // Amériques
  'Etats-Unis', 'Canada', 'Mexique', 'Brésil',
  // Asie
  'Chine', 'Japon', 'Singapour', 'Hong Kong',
  // Moyen-Orient
  'Arabie Saoudite', 'Emirats Arabes Unis', 'Turquie',
];

interface ModalForm {
  name:    string;
  code:    string;
  country: string;
  type:    BankType;
}

@Component({
  selector: 'app-project-management',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './project-management.component.html',
  styleUrls: ['./project-management.component.css'],
})
export class ProjectManagementComponent implements OnInit {
  readonly SearchIcon    = Search;
  readonly PlusIcon      = Plus;
  readonly PencilIcon    = Pencil;
  readonly TrashIcon     = Trash2;
  readonly XIcon         = X;
  readonly Building2Icon = Building2;
  readonly GlobeIcon     = Globe;
  readonly ToggleOnIcon  = ToggleRight;
  readonly ToggleOffIcon = ToggleLeft;
  readonly UsersIcon     = Users;
  readonly ShieldIcon    = ShieldCheck;

  readonly countries: string[] = COUNTRIES;
  readonly bankTypes: BankType[] = ['ACQUIRER', 'ISSUER', 'BOTH'];

  // ── Tabs ──────────────────────────────────────────────────────────────────
  activeTab = signal<'projects' | 'assignments'>('projects');

  // ── Banks (Tab 1) ─────────────────────────────────────────────────────────
  /** Expose store signal so the template can call projects() directly */
  get projects() { return this.bankStore.projects; }
  searchQuery    = signal('');
  showModal      = signal(false);
  editingProject = signal<BankProject | null>(null);
  deleteTarget   = signal<BankProject | null>(null);

  form: ModalForm = { name: '', code: '', country: 'Maroc', type: 'BOTH' };
  formError = '';

  // ── Assignments (Tab 2) ───────────────────────────────────────────────────
  /** Stores only the ID so the computed always reflects fresh store data. */
  private assignTargetId = signal<number | null>(null);
  readonly assignTarget  = computed<AppUser | null>(() => {
    const id = this.assignTargetId();
    if (id === null) return null;
    return this.userStore.users().find(u => u.id === id) ?? null;
  });
  userSearch = signal('');

  constructor(
    private readonly http: HttpClient,
    private readonly userStore: UserStoreService,
    private readonly bankStore: BankProjectStoreService,
  ) {}

  ngOnInit(): void {
    this.userStore.loadFromBackend();
  }

  // ── Computed (banks) ──────────────────────────────────────────────────────
  filteredProjects = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.bankStore.projects();
    if (!q) return list;
    return list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.country.toLowerCase().includes(q)
    );
  });

  totalCount    = computed(() => this.bankStore.projects().length);
  activeCount   = computed(() => this.bankStore.projects().filter(p => p.status === 'ACTIVE').length);
  inactiveCount = computed(() => this.bankStore.projects().filter(p => p.status === 'INACTIVE').length);
  acquirerCount = computed(() => this.bankStore.projects().filter(p => p.type === 'ACQUIRER').length);
  issuerCount   = computed(() => this.bankStore.projects().filter(p => p.type === 'ISSUER').length);
  bothCount     = computed(() => this.bankStore.projects().filter(p => p.type === 'BOTH').length);

  // ── Computed (users) ──────────────────────────────────────────────────────
  filteredUsers = computed(() => {
    const q = this.userSearch().toLowerCase().trim();
    const users = this.userStore.users();
    if (!q) return users;
    return users.filter(u =>
      (u.firstName + ' ' + u.lastName).toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  // ── Modal (bank CRUD) ─────────────────────────────────────────────────────
  openCreate(): void {
    this.editingProject.set(null);
    this.form = { name: '', code: '', country: 'Maroc', type: 'BOTH' };
    this.formError = '';
    this.showModal.set(true);
  }

  openEdit(p: BankProject): void {
    this.editingProject.set(p);
    this.form = { name: p.name, code: p.code, country: p.country, type: p.type };
    this.formError = '';
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeModal();
    this.deleteTarget.set(null);
    this.assignTargetId.set(null);
  }

  saveProject(): void {
    if (!this.form.name.trim() || !this.form.code.trim() || !this.form.country) {
      this.formError = 'Tous les champs sont obligatoires.';
      return;
    }
    if (this.form.code.length > 6) {
      this.formError = 'Le code banque ne doit pas dépasser 6 caractères.';
      return;
    }
    const editing = this.editingProject();
    if (editing) {
      this.bankStore.update({ ...editing, ...this.form, code: this.form.code.trim().toUpperCase() });
    } else {
      this.bankStore.add(this.form);
    }
    this.closeModal();
  }

  // ── Bank actions ──────────────────────────────────────────────────────────
  toggleStatus(p: BankProject): void {
    this.bankStore.toggleStatus(p.id!);
  }

  confirmDelete(p: BankProject): void { this.deleteTarget.set(p); }
  cancelDelete(): void                { this.deleteTarget.set(null); }

  executeDelete(): void {
    const t = this.deleteTarget();
    if (t) {
      this.bankStore.remove(t.id!);
      this.deleteTarget.set(null);
    }
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onUserSearch(event: Event): void {
    this.userSearch.set((event.target as HTMLInputElement).value);
  }

  // ── Assignment actions ────────────────────────────────────────────────────
  openAssign(user: AppUser): void { this.assignTargetId.set(user.id); }
  closeAssign(): void             { this.assignTargetId.set(null); }

  hasProject(user: AppUser, code: string): boolean {
    return user.projects.includes(code);
  }

  toggleProject(user: AppUser, code: string): void {
    const has = user.projects.includes(code);
    const newProjects = has
      ? user.projects.filter(c => c !== code)
      : [...user.projects, code];

    // Optimistic update  -  assignTarget recomputes automatically from the store
    this.userStore.users.update(list =>
      list.map(u => u.id !== user.id ? u : { ...u, projects: newProjects })
    );

    // Persist to backend; on success reload confirms saved state,
    // on error reload reverts the optimistic update
    this.http.put<any>(
      `${environment.apiBaseUrl}/admin/users/${user.id}`,
      {
        firstName: user.firstName,
        lastName:  user.lastName,
        role:      user.role,
        projects:  newProjects.join(','),
      }
    ).subscribe({
      next:  () => this.userStore.loadFromBackend(),
      error: () => this.userStore.loadFromBackend(),
    });
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  typeBadge(type: BankType): string {
    const map: Record<BankType, string> = {
      ACQUIRER: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
      ISSUER:   'bg-violet-500/10 text-violet-400 border border-violet-500/30',
      BOTH:     'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30',
    };
    return map[type];
  }

  typeLabel(type: BankType): string {
    const map: Record<BankType, string> = {
      ACQUIRER: 'Acquéreur', ISSUER: 'Émetteur', BOTH: 'Acquéreur & Émetteur',
    };
    return map[type];
  }

  statusBadge(status: BankStatus): string {
    return status === 'ACTIVE'
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
      : 'bg-slate-500/10 text-slate-400 border border-slate-500/30';
  }

  statusLabel(status: BankStatus): string {
    return status === 'ACTIVE' ? 'Actif' : 'Inactif';
  }

  roleBadge(role: string): string {
    return role === 'ADMIN'
      ? 'bg-red-500/10 text-red-400 border border-red-500/30'
      : 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
  }

  roleLabel(role: string): string {
    return role === 'ADMIN' ? 'Administrateur' : 'Utilisateur';
  }

  initials(u: AppUser): string {
    return (u.firstName[0] + u.lastName[0]).toUpperCase();
  }

  countryFlag(country: string): string {
    const flags: Record<string, string> = {
      'Maroc': 'MA', 'France': 'FR', 'Espagne': 'ES', 'Tunisie': 'TN',
      'Sénégal': 'SN', "Côte d'Ivoire": 'CI', 'Belgique': 'BE',
      'Allemagne': 'DE', 'Italie': 'IT', 'Portugal': 'PT',
    };
    return flagEmoji(flags[country] ?? '');
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
}

function flagEmoji(code: string): string {
  if (!code || code.length !== 2) return '';
  const up = code.toUpperCase();
  return String.fromCodePoint(0x1F1E0 + up.charCodeAt(0) - 65) +
         String.fromCodePoint(0x1F1E0 + up.charCodeAt(1) - 65);
}
