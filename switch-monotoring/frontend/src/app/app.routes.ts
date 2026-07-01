import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { SetPasswordComponent } from './pages/activate/set-password.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { TransactionsComponent } from './pages/transactions/transactions.component';
import { TransactionAnalysisComponent } from './pages/transaction-analysis/transaction-analysis.component';
import { AtmComponent } from './pages/atm/atm.component';
import { PosComponent } from './pages/pos/pos.component';
import { EcomComponent } from './pages/ecom/ecom.component';
import { DataGeneratorComponent } from './pages/data-generator/data-generator.component';
import { AlertesComponent } from './pages/alertes/alertes.component';
import { UserManagementComponent } from './pages/admin/user-management/user-management.component';
import { ProjectManagementComponent } from './pages/admin/project-management/project-management.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  // Routes publiques  -  accessibles sans authentification
  { path: 'login',            component: LoginComponent },
  { path: 'activate/:token',       component: SetPasswordComponent },
  { path: 'reset-password/:token', component: SetPasswordComponent },

  // Routes protegees  -  authGuard verifie la session active
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '',             component: DashboardComponent },
      { path: 'transactions', component: TransactionsComponent },
      { path: 'analysis',     component: TransactionAnalysisComponent },
      { path: 'atm',          component: AtmComponent },
      { path: 'pos',          component: PosComponent },
      { path: 'ecom',         component: EcomComponent },
      { path: 'alertes',      component: AlertesComponent },
      { path: 'data-generator', component: DataGeneratorComponent },

      // Routes admin  -  double protection authGuard + adminGuard
      {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          { path: 'users',    component: UserManagementComponent },
          { path: 'projects', component: ProjectManagementComponent },
          { path: '',         redirectTo: 'users', pathMatch: 'full' },
        ],
      },
    ],
  },

  // Redirection par defaut
  { path: '**', redirectTo: '' },
];
