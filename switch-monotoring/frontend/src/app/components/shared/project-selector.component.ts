import {
  Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProjectFilterService } from '../../services/project-filter.service';
import { AuthService } from '../../services/auth.service';
import { UserStoreService } from '../../services/user-store.service';
import { BankProjectStoreService } from '../../services/bank-project-store.service';
import { BankProject } from '../../models';

// ── Zone / country mappings ───────────────────────────────────────────────────

const COUNTRY_ZONE: Record<string, string> = {
  'Maroc': 'Afrique', "Côte d'Ivoire": 'Afrique', 'Tunisie': 'Afrique',
  'Sénégal': 'Afrique', 'Afrique du Sud': 'Afrique', 'Nigeria': 'Afrique', 'Égypte': 'Afrique',
  'France': 'Europe', 'Royaume-Uni': 'Europe', 'Espagne': 'Europe',
  'Allemagne': 'Europe', 'Grèce': 'Europe', 'Belgique': 'Europe',
  'Italie': 'Europe', 'Portugal': 'Europe', 'Pays-Bas': 'Europe', 'Suisse': 'Europe',
  'Etats-Unis': 'Amériques', 'Canada': 'Amériques', 'Mexique': 'Amériques', 'Brésil': 'Amériques',
  'Chine': 'Asie', 'Japon': 'Asie', 'Singapour': 'Asie', 'Hong Kong': 'Asie',
  'Arabie Saoudite': 'Moyen-Orient', 'Emirats Arabes Unis': 'Moyen-Orient', 'Turquie': 'Moyen-Orient',
};

const ZONE_ORDER = ['Afrique', 'Europe', 'Amériques', 'Asie', 'Moyen-Orient'];

const FLAGS: Record<string, string> = {
  'Maroc': '', "Côte d'Ivoire": '', 'Tunisie': '', 'Sénégal': '',
  'Afrique du Sud': '', 'Nigeria': '', 'Égypte': '',
  'France': '', 'Royaume-Uni': '', 'Espagne': '', 'Allemagne': '', 'Grèce': '',
  'Etats-Unis': '', 'Canada': '', 'Mexique': '', 'Brésil': '',
  'Chine': '', 'Japon': '', 'Singapour': '', 'Hong Kong': '',
  'Arabie Saoudite': '', 'Emirats Arabes Unis': '', 'Turquie': '',
};

interface CountryGroup { country: string; flag: string; projects: BankProject[]; }
interface ZoneGroup    { zone: string; countries: CountryGroup[]; total: number; }

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-project-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .scroll-area::-webkit-scrollbar { width: 4px; }
    .scroll-area::-webkit-scrollbar-track { background: transparent; }
    .scroll-area::-webkit-scrollbar-thumb { background: rgba(99,102,241,.3); border-radius: 99px; }
    .scroll-area::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,.55); }
  `],
  template: `
<ng-container>

  <!-- ══ Trigger button ══════════════════════════════════════════════════════ -->
  <button (click)="toggleModal($event)"
          class="btn-hps flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs
                 transition-all duration-200 shadow-sm hover:shadow-md">
    <span class="relative flex h-2 w-2">
      <span *ngIf="activeProject"
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60">
      </span>
      <span class="relative inline-flex rounded-full h-2 w-2"
            [ngClass]="activeProject ? 'bg-white' : 'bg-white/50'">
      </span>
    </span>
    <span class="max-w-[160px] truncate text-white font-button font-medium">
      {{ activeProject ? activeProjectName : 'Tous les projets' }}
    </span>
    <svg class="w-3 h-3 shrink-0 transition-transform duration-200" [class.rotate-180]="isOpen"
         xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
            clip-rule="evenodd"/>
    </svg>
  </button>

  <!-- ══ Modal ═══════════════════════════════════════════════════════════════ -->
  <div *ngIf="isOpen" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">

    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" (click)="closeModal()"></div>

    <!-- ── Panel ─────────────────────────────────────────────────────────── -->
    <div class="relative z-10 w-full max-w-xl flex flex-col overflow-hidden
                bg-card border border-border/50 rounded-2xl shadow-2xl"
         style="max-height: min(88vh, 720px);"
         (click)="$event.stopPropagation()">

      <!-- ── FIXED: Header ────────────────────────────────────────────────── -->
      <div class="shrink-0 flex items-center justify-between px-5 py-4
                  border-b border-border/30 bg-card">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20
                      flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-primary" xmlns="http://www.w3.org/2000/svg"
                 viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5zm6.5-9A2.25 2.25 0 0 0 8.5 4.25v2.5A2.25 2.25 0 0 0 10.75 9h2.5A2.25 2.25 0 0 0 15.5 6.75v-2.5A2.25 2.25 0 0 0 13.25 2h-2.5zm0 9A2.25 2.25 0 0 0 8.5 13.25v2.5A2.25 2.25 0 0 0 10.75 18h2.5A2.25 2.25 0 0 0 15.5 15.75v-2.5A2.25 2.25 0 0 0 13.25 11h-2.5z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-foreground leading-tight">Sélection de projet</h3>
            <p class="text-[11px] text-muted-foreground leading-tight mt-0.5">
              {{ assignedProjects().length }} projet{{ assignedProjects().length > 1 ? 's' : '' }}
              &middot;
              {{ zoneCount }} zone{{ zoneCount > 1 ? 's' : '' }}
            </p>
          </div>
        </div>
        <button (click)="closeModal()"
                class="h-8 w-8 rounded-lg border border-border/40 flex items-center justify-center
                       text-muted-foreground hover:bg-red-500/10 hover:border-red-500/30
                       hover:text-red-400 transition-colors shrink-0">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z"/>
          </svg>
        </button>
      </div>

      <!-- ── FIXED: All-projects + Search ─────────────────────────────────── -->
      <div class="shrink-0 px-5 pt-4 pb-3 border-b border-border/20 bg-card space-y-3">

        <!-- "All projects" option -->
        <button (click)="selectAll()"
                [ngClass]="!activeProject
                  ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20'
                  : 'border-border/40 hover:border-primary/40 hover:bg-primary/5'"
                class="w-full rounded-xl border px-4 py-2.5 text-left transition-all duration-150">
          <div class="flex items-center gap-3">
            <div [ngClass]="!activeProject ? 'bg-primary/20 text-primary' : 'bg-muted/40 text-muted-foreground'"
                 class="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                      d="M1 2.75A.75.75 0 0 1 1.75 2h16.5a.75.75 0 0 1 0 1.5H18v8.75A2.75 2.75 0 0 1 15.25 15h-1.072l.798 3.06a.75.75 0 0 1-1.452.38L13.41 18H6.59l-.114.44a.75.75 0 0 1-1.452-.38L5.823 15H4.75A2.75 2.75 0 0 1 2 12.25V3.5h-.25A.75.75 0 0 1 1 2.75z"
                      clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-foreground">Tous mes projets assignés</p>
              <p class="text-[11px] text-muted-foreground">
                Vue consolidée &middot; {{ assignedProjects().length }} projets
              </p>
            </div>
            <svg *ngIf="!activeProject" class="w-4 h-4 text-primary shrink-0"
                 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd"
                    d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5z"
                    clip-rule="evenodd"/>
            </svg>
          </div>
        </button>

        <!-- Search input -->
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5
                      text-muted-foreground/60 pointer-events-none"
               xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
                  d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9z"
                  clip-rule="evenodd"/>
          </svg>
          <input type="text"
                 [(ngModel)]="searchQuery"
                 placeholder="Rechercher par nom, code ou pays…"
                 class="w-full pl-9 pr-9 py-2 bg-muted/30 border border-border/50 rounded-lg
                        text-xs text-foreground placeholder:text-muted-foreground/60
                        focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
                        transition-all duration-150"/>
          <button *ngIf="searchQuery" (click)="searchQuery = ''"
                  class="absolute right-3 top-1/2 -translate-y-1/2
                         text-muted-foreground/50 hover:text-foreground transition-colors">
            <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- ── SCROLLABLE: grouped list ──────────────────────────────────────── -->
      <div class="scroll-area overflow-y-auto flex-1 min-h-0 px-5 py-3">

        <!-- Empty state: no assigned projects -->
        <div *ngIf="assignedProjects().length === 0"
             class="py-14 flex flex-col items-center gap-3 text-center">
          <div class="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center">
            <svg class="w-5 h-5 text-muted-foreground/40" xmlns="http://www.w3.org/2000/svg"
                 viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd"
                    d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5zm6.5-9A2.25 2.25 0 0 0 8.5 4.25v2.5A2.25 2.25 0 0 0 10.75 9h2.5A2.25 2.25 0 0 0 15.5 6.75v-2.5A2.25 2.25 0 0 0 13.25 2h-2.5zm0 9A2.25 2.25 0 0 0 8.5 13.25v2.5A2.25 2.25 0 0 0 10.75 18h2.5A2.25 2.25 0 0 0 15.5 15.75v-2.5A2.25 2.25 0 0 0 13.25 11h-2.5z"
                    clip-rule="evenodd"/>
            </svg>
          </div>
          <p class="text-sm font-semibold text-foreground">Aucun projet assigné</p>
          <p class="text-xs text-muted-foreground max-w-[220px]">
            Contactez votre administrateur pour qu'il vous assigne des projets.
          </p>
        </div>

        <!-- Empty state: search no results -->
        <div *ngIf="assignedProjects().length > 0 && groupedByZone.length === 0"
             class="py-14 flex flex-col items-center gap-3 text-center">
          <div class="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center">
            <svg class="w-5 h-5 text-muted-foreground/40" xmlns="http://www.w3.org/2000/svg"
                 viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd"
                    d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9z"
                    clip-rule="evenodd"/>
            </svg>
          </div>
          <p class="text-sm text-muted-foreground">
            Aucun résultat pour <strong class="text-foreground">"{{ searchQuery }}"</strong>
          </p>
        </div>

        <!-- ── Zone sections ──────────────────────────────────────────────── -->
        <div *ngFor="let zone of groupedByZone; let last = last"
             [class.mb-5]="!last" [class.mb-1]="last">

          <!-- Zone header (sticky) -->
          <div class="flex items-center gap-2 mb-2 pt-1 sticky top-0 z-10 bg-card py-1.5">
            <div class="h-1 w-5 rounded-full shrink-0" [ngClass]="zoneAccent(zone.zone)"></div>
            <span class="text-[10px] font-bold uppercase tracking-widest shrink-0"
                  [ngClass]="zoneText(zone.zone)">Zone {{ zone.zone }}</span>
            <div class="flex-1 h-px bg-border/50"></div>
            <span class="text-[9px] font-mono text-muted-foreground/60 shrink-0">
              {{ zone.total }} projet{{ zone.total > 1 ? 's' : '' }}
            </span>
          </div>

          <!-- ── Country groups ─────────────────────────────────────────── -->
          <div *ngFor="let cg of zone.countries" class="mb-3">

            <!-- Country sub-header -->
            <div class="flex items-center gap-2 px-1 mb-1.5">
              <span class="text-base leading-none">{{ cg.flag }}</span>
              <span class="text-[11px] font-semibold text-muted-foreground">{{ cg.country }}</span>
              <div class="flex-1 h-px bg-border/40"></div>
              <span class="text-[9px] text-muted-foreground/60 font-mono">{{ cg.projects.length }}</span>
            </div>

            <!-- Bank items -->
            <div *ngFor="let project of cg.projects"
                 (click)="selectProject(project.code)"
                 [ngClass]="activeProject === project.code
                   ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20'
                   : 'border-border/40 bg-muted/20 hover:border-primary/40 hover:bg-primary/5'"
                 class="group rounded-xl border px-4 py-2.5 cursor-pointer flex items-center gap-3
                        transition-all duration-150 mb-1">

              <!-- Code badge -->
              <div class="h-8 w-11 rounded-lg flex items-center justify-center shrink-0
                          font-mono text-[9px] font-black border tracking-wide transition-colors"
                   [ngClass]="activeProject === project.code
                     ? 'bg-primary/20 text-primary border-primary/30'
                     : 'bg-muted/40 text-muted-foreground border-border/50
                        group-hover:border-primary/30 group-hover:text-primary/80'">
                {{ project.code.slice(0, 6) }}
              </div>

              <!-- Name + meta -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-foreground truncate leading-tight">
                  {{ project.name }}
                </p>
                <p class="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <span [ngClass]="project.status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'">
                    &#9679; {{ project.status === 'ACTIVE' ? 'Actif' : 'Inactif' }}
                  </span>
                  <span class="opacity-30">&middot;</span>
                  <span class="font-mono opacity-60">{{ project.type }}</span>
                </p>
              </div>

              <!-- Check (selected) -->
              <svg *ngIf="activeProject === project.code"
                   class="w-4 h-4 text-primary shrink-0"
                   xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5z"
                      clip-rule="evenodd"/>
              </svg>
              <!-- Arrow on hover (not selected) -->
              <svg *ngIf="activeProject !== project.code"
                   class="w-3.5 h-3.5 text-transparent group-hover:text-muted-foreground/40
                          transition-all shrink-0"
                   xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                      d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06z"
                      clip-rule="evenodd"/>
              </svg>
            </div>

          </div>
        </div>

      </div>

      <!-- ── FIXED: Footer ─────────────────────────────────────────────────── -->
      <div class="shrink-0 px-5 py-3.5 border-t border-border/30 bg-card
                  flex items-center justify-between gap-4">
        <div class="min-w-0 flex-1">
          <p class="text-[11px] text-muted-foreground truncate">
            <span class="font-semibold text-foreground/70">Sélection :</span>
            <span *ngIf="activeProject"
                  class="ml-1 text-primary font-semibold">{{ activeProjectName }}</span>
            <span *ngIf="!activeProject" class="ml-1 italic">Tous les projets assignés</span>
          </p>
        </div>
        <button (click)="closeModal()"
                class="shrink-0 px-5 py-2 rounded-lg bg-primary text-primary-foreground
                       text-xs font-semibold hover:bg-primary/85 active:scale-95
                       transition-all duration-150 shadow-sm">
          Appliquer
        </button>
      </div>

    </div>
  </div>
</ng-container>
  `,
})
export class ProjectSelectorComponent implements OnInit, OnDestroy {
  isOpen        = false;
  activeProject = '';
  searchQuery   = '';

  // Reactive: auto-updates when userStore.users() or auth.currentUser() changes
  readonly assignedProjects = computed<BankProject[]>(() => {
    const user = this.auth.currentUser();
    if (!user) return [];

    const all = this.bankStore.getAll();
    if (user.role === 'ADMIN') return all;

    // Prefer fresh data from userStore; fall back to session data
    const stored = this.userStore.users().find(u => u.id === user.id);
    const storedCodes: string[] = stored?.projects ?? [];
    const sessionCodes: string[] = user.projects ?? [];
    const codes = storedCodes.length > 0 ? storedCodes : sessionCodes;

    if (codes.length === 0) return [];
    return all.filter(b => codes.includes(b.code));
  });

  // ── Derived getters ─────────────────────────────────────────────────────────

  get activeProjectName(): string {
    return this.assignedProjects().find(p => p.code === this.activeProject)?.name ?? this.activeProject;
  }

  get groupedByZone(): ZoneGroup[] {
    const q = this.searchQuery.trim().toLowerCase();
    const source = q
      ? this.assignedProjects().filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.country.toLowerCase().includes(q)
        )
      : this.assignedProjects();

    const zoneMap = new Map<string, Map<string, BankProject[]>>();
    for (const p of source) {
      const zone = COUNTRY_ZONE[p.country] ?? 'Autre';
      if (!zoneMap.has(zone)) zoneMap.set(zone, new Map());
      const cMap = zoneMap.get(zone)!;
      if (!cMap.has(p.country)) cMap.set(p.country, []);
      cMap.get(p.country)!.push(p);
    }

    return ZONE_ORDER
      .filter(z => zoneMap.has(z))
      .map(z => {
        const cMap = zoneMap.get(z)!;
        const countries: CountryGroup[] = [...cMap.entries()].map(([country, projects]) => ({
          country,
          flag: FLAGS[country] ?? '',
          projects,
        }));
        return { zone: z, countries, total: countries.reduce((s, c) => s + c.projects.length, 0) };
      });
  }

  get zoneCount(): number { return this.groupedByZone.length; }

  // ── Zone visual helpers ─────────────────────────────────────────────────────

  zoneAccent(zone: string): string {
    const m: Record<string, string> = {
      'Afrique':      'bg-amber-500',
      'Europe':       'bg-blue-500',
      'Amériques':    'bg-emerald-500',
      'Asie':         'bg-red-500',
      'Moyen-Orient': 'bg-violet-500',
    };
    return m[zone] ?? 'bg-muted';
  }

  zoneText(zone: string): string {
    const m: Record<string, string> = {
      'Afrique':      'text-amber-600 dark:text-amber-400',
      'Europe':       'text-blue-600 dark:text-blue-400',
      'Amériques':    'text-emerald-600 dark:text-emerald-400',
      'Asie':         'text-red-600 dark:text-red-400',
      'Moyen-Orient': 'text-violet-600 dark:text-violet-400',
    };
    return m[zone] ?? 'text-muted-foreground';
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  private sub?: Subscription;

  constructor(
    private readonly projectFilter: ProjectFilterService,
    private readonly auth:          AuthService,
    private readonly userStore:     UserStoreService,
    private readonly cdr:           ChangeDetectorRef,
    private readonly bankStore:     BankProjectStoreService,
  ) {}

  ngOnInit(): void {
    this.sub = this.projectFilter.activeProject$.subscribe(code => {
      this.activeProject = code;
      this.cdr.markForCheck();
    });
    // Refresh userStore on init so assignedProjects computed gets fresh data.
    // GET /admin/users est reserve aux ADMIN cote backend (403 sinon) : les
    // utilisateurs non-admin se rabattent sur user.projects (donnees de session).
    if (this.auth.isAdmin()) {
      this.userStore.loadFromBackend();
    }
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeModal(); }

  // ── Actions ─────────────────────────────────────────────────────────────────

  toggleModal(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.auth.isAdmin()) {
      this.searchQuery = '';
      // Fetch fresh project assignments so user sees admin changes immediately
      this.userStore.loadFromBackend();
    } else if (this.isOpen) {
      this.searchQuery = '';
    }
  }

  closeModal(): void   { this.isOpen = false; this.searchQuery = ''; }
  selectAll(): void    { this.projectFilter.clearProject();        this.closeModal(); }
  selectProject(code: string): void { this.projectFilter.setProject(code); this.closeModal(); }
}
