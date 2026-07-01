import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BankProjectStoreService } from './bank-project-store.service';

@Injectable({ providedIn: 'root' })
export class ProjectFilterService {
  private readonly _active = new BehaviorSubject<string>('');

  readonly activeProject$ = this._active.asObservable();

  constructor(private readonly bankStore: BankProjectStoreService) {}

  get activeProject(): string { return this._active.value; }

  getProjectName(code: string): string {
    return this.bankStore.getName(code);
  }

  get activeProjectName(): string {
    const code = this._active.value;
    return code ? this.bankStore.getName(code) : '';
  }

  setProject(code: string): void { this._active.next(code); }

  clearProject(): void { this._active.next(''); }
}
