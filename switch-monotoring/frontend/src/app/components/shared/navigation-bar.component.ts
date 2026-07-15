import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-navigation-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navigation-bar">
      <div class="nav-container">
        <!-- Logo -->
        <div class="nav-logo">
          <span class="logo-icon"></span>
          <span class="logo-text">Switch Monitor</span>
        </div>

        <!-- Main Navigation -->
        <div class="nav-menu">
          <a 
            routerLink="/" 
            routerLinkActive="active" 
            [routerLinkActiveOptions]="{exact: true}"
            class="nav-item">
            <span></span>
            <span>Dashboard</span>
          </a>
          <a 
            routerLink="/analysis" 
            routerLinkActive="active"
            class="nav-item highlight">
            <span></span>
            <span>Analyse Trans.</span>
          </a>
          <a 
            routerLink="/transactions" 
            routerLinkActive="active"
            class="nav-item">
            <span></span>
            <span>Transactions</span>
          </a>
          <a 
            routerLink="/atm" 
            routerLinkActive="active"
            class="nav-item">
            <span></span>
            <span>ATM/GAB</span>
          </a>
          <a 
            routerLink="/pos" 
            routerLinkActive="active"
            class="nav-item">
            <span></span>
            <span>POS</span>
          </a>
          <a
            routerLink="/ecom"
            routerLinkActive="active"
            class="nav-item">
            <span></span>
            <span>E-Commerce</span>
          </a>
          <a
            routerLink="/monetix"
            routerLinkActive="active"
            class="nav-item highlight monetix-link">
            <span></span>
            <span>Intelligence</span>
          </a>
          <a
            routerLink="/geo"
            routerLinkActive="active"
            class="nav-item highlight geo-link">
            <span></span>
            <span>Zone Health</span>
          </a>
        </div>

        <!-- Right Actions -->
        <div class="nav-actions">
          <button class="nav-btn" title="Paramètres">
            <span></span>
          </button>
          <button class="nav-btn" title="Aide">
            <span>?</span>
          </button>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navigation-bar {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border-bottom: 2px solid rgba(6, 182, 212, 0.2);
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .nav-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1600px;
      margin: 0 auto;
      padding: 12px 20px;
    }

    .nav-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 700;
      color: #fff;
      font-size: 18px;
      min-width: 180px;
    }

    .logo-icon {
      font-size: 24px;
    }

    .logo-text {
      background: linear-gradient(135deg, #06b6d4, #22c55e);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .nav-menu {
      display: flex;
      gap: 8px;
      flex: 1;
      justify-content: center;
      flex-wrap: wrap;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      color: #cbd5e1;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #e0e7ff;
    }

    .nav-item.active {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(34, 197, 94, 0.2));
      color: #06b6d4;
      border-bottom: 2px solid #06b6d4;
    }

    .nav-item.highlight {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(34, 197, 94, 0.15));
    }

    .nav-item.highlight:hover {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(34, 197, 94, 0.25));
      box-shadow: 0 0 20px rgba(6, 182, 212, 0.2);
    }

    .nav-actions {
      display: flex;
      gap: 12px;
      min-width: 100px;
      justify-content: flex-end;
    }

    .nav-btn {
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #cbd5e1;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .nav-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(6, 182, 212, 0.3);
      color: #06b6d4;
    }

    @media (max-width: 768px) {
      .nav-container {
        flex-wrap: wrap;
        gap: 12px;
      }

      .nav-menu {
        order: 3;
        width: 100%;
        justify-content: space-around;
      }

      .nav-logo {
        min-width: auto;
      }

      .logo-text {
        display: none;
      }

      .nav-actions {
        min-width: auto;
      }

      .nav-item span:last-child {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .nav-item {
        padding: 6px 10px;
        font-size: 12px;
      }

      .nav-btn {
        padding: 6px 10px;
      }
    }
  `]
})
export class NavigationBarComponent {}
