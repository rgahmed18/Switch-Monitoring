import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import {
  LucideAngularModule,
  LayoutDashboard,
  ArrowLeftRight,
  Bell,
  BarChart3,
  Radio,
  ChevronLeft,
  ChevronRight,
  Globe,
  Users,
  Building2,
  Moon,
  Sun,
  Landmark,
  ShoppingCart,
  LogOut,
} from 'lucide-angular';
import { AppStateService } from './state.service';
import { AuthService } from './services/auth.service';
import { ProjectFilterService } from './services/project-filter.service';
import { TransactionStoreService } from './services/transaction-store.service';
import { TranslatePipe } from './pipes/translate.pipe';
import { ProjectSelectorComponent } from './components/shared/project-selector.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, LucideAngularModule, TranslatePipe, ProjectSelectorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  readonly LayoutDashboard = LayoutDashboard;
  readonly ArrowLeftRight  = ArrowLeftRight;
  readonly Bell            = Bell;
  readonly BarChart3       = BarChart3;
  readonly Radio           = Radio;
  readonly ChevronLeft     = ChevronLeft;
  readonly ChevronRight    = ChevronRight;
  readonly Globe           = Globe;
  readonly UsersIcon       = Users;
  readonly Building2       = Building2;
  readonly Moon            = Moon;
  readonly Sun             = Sun;
  readonly Landmark        = Landmark;
  readonly ShoppingCart    = ShoppingCart;
  readonly LogOutIcon      = LogOut;

  collapsed = false;
  currentPath = '';
  isDarkMode = false;

  get currentLang()     { return this.appState.lang(); }
  get isLive()          { return this.appState.isLive(); }
  get currentUser()     { return this.authService.currentUser(); }
  get isLoginPage()     { return this.currentPath === '/login'; }
  get isAdminUser()     { return this.authService.isAdmin(); }

  navItems = [
    { path: '/',             icon: LayoutDashboard, label: 'nav.dashboard'    },
    { path: '/analysis',     icon: BarChart3,       label: 'nav.analysis'     },
    { path: '/alertes',      icon: Bell,            label: 'nav.alertes'      },
    { path: '/atm',          icon: Landmark,        label: 'nav.atm'          },
    { path: '/pos',          icon: ShoppingCart,    label: 'nav.pos'          },
    { path: '/ecom',         icon: Globe,           label: 'nav.ecom'         },
    { path: '/transactions', icon: ArrowLeftRight,  label: 'nav.transactions' },
  ];

  adminItems = [
    { path: '/admin/users',    icon: Users,     label: 'nav.admin.users'    },
    { path: '/admin/projects', icon: Building2, label: 'nav.admin.projects' },
  ];

  constructor(
    private router: Router,
    private appState: AppStateService,
    private authService: AuthService,
    private projectFilter: ProjectFilterService,
    private txStore: TransactionStoreService,
  ) {
    // Initialise currentPath immediatement depuis l'URL active (evite le flash sidebar sur /login)
    this.currentPath = this.router.url;

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentPath = event.urlAfterRedirects ?? event.url;
    });
  }

  ngOnInit() {
    const saved = localStorage.getItem('hps-theme');
    this.isDarkMode = saved === 'dark';
    document.documentElement.classList.toggle('dark', this.isDarkMode);
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.classList.toggle('dark', this.isDarkMode);
    localStorage.setItem('hps-theme', this.isDarkMode ? 'dark' : 'light');
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
  }

  toggleLanguage() {
    this.appState.toggleLanguage();
  }

  toggleLive() {
    const wasPaused = !this.appState.isLive();
    this.appState.toggleLive();
    if (wasPaused) {
      this.txStore.flushBuffer();
    }
  }

  get bufferSize(): number { return this.txStore.bufferSize; }

  logout() {
    this.authService.logout();
    this.projectFilter.clearProject();
  }

  getPageTitle() {
    const item = [...this.navItems, ...this.adminItems].find(p => p.path === this.currentPath);
    return item ? item.label : 'Switch Monitoring';
  }
}
