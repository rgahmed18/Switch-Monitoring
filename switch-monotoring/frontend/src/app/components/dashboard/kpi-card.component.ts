import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div [ngClass]="['rounded-lg border bg-card p-3 sm:p-4 lg:p-5 transition-all hover:bg-secondary/50', variantStyles[variant]]">
      <div class="flex items-center justify-between mb-2 sm:mb-3">
        <span class="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground truncate pr-1">{{title}}</span>
        <lucide-icon [img]="icon" [ngClass]="['h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0', iconVariantStyles[variant]]"></lucide-icon>
      </div>
      <div class="font-mono text-lg sm:text-xl lg:text-2xl font-bold text-card-foreground">{{value}}</div>
      <div class="mt-1 flex items-center gap-2">
        <span *ngIf="subtitle" class="text-[10px] sm:text-xs" [ngClass]="subtitleColor || 'text-muted-foreground'">{{subtitle}}</span>
        <span *ngIf="trend" [ngClass]="['text-[10px] sm:text-xs font-medium', trend.positive ? 'text-success' : 'text-destructive']">
          {{trend.positive ? '↑' : '↓'}} {{trend.value}}
        </span>
      </div>
    </div>
  `
})
export class KpiCardComponent {
  @Input() title!: string;
  @Input() value!: string | number;
  @Input() subtitle?: string;
  @Input() subtitleColor?: string;
  @Input() icon: any;
  @Input() trend?: { value: string; positive: boolean };
  @Input() variant: 'default' | 'success' | 'warning' | 'danger' = 'default';

  get variantStyles(): Record<string, string> {
    return {
      default: 'border-border',
      success: 'border-success/30 glow-primary',
      warning: 'border-warning/30 glow-warning',
      danger: 'border-destructive/30 glow-destructive',
    };
  }

  get iconVariantStyles(): Record<string, string> {
    return {
      default: 'text-accent',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-destructive',
    };
  }
}
