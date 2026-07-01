import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppUser } from '../models';
import { environment } from '../../environments/environment';

const API_BASE = environment.apiBaseUrl;

export const MOCK_USERS: AppUser[] = [
  { id: 1, username: 'a.benbrahim', firstName: 'Ahmed',   lastName: 'Benbrahim', email: 'a.benbrahim@switch.ma', role: 'ADMIN', status: 'ACTIVE',  projects: ['AWB', 'BMCE', 'CDM', 'SGM', 'CIH', 'BPM', 'BNP', 'BIAT'], createdAt: '2024-01-15' },
  { id: 2, username: 'f.idrissi',   firstName: 'Fatima',  lastName: 'Idrissi',   email: 'f.idrissi@switch.ma',   role: 'USER',  status: 'ACTIVE',  projects: ['AWB'],        createdAt: '2024-02-20' },
  { id: 3, username: 'k.tazi',      firstName: 'Karim',   lastName: 'Tazi',      email: 'k.tazi@switch.ma',      role: 'USER',  status: 'ACTIVE',  projects: ['BMCE'],       createdAt: '2024-03-10' },
  { id: 4, username: 'l.moussaoui', firstName: 'Leila',   lastName: 'Moussaoui', email: 'l.moussaoui@switch.ma', role: 'USER',  status: 'ACTIVE',  projects: ['AWB'],        createdAt: '2024-04-05' },
  { id: 5, username: 'o.elfassi',   firstName: 'Omar',    lastName: 'El Fassi',  email: 'o.elfassi@hps.ma',      role: 'USER',  status: 'BLOCKED', projects: [],             createdAt: '2024-05-12' },
  { id: 6, username: 'n.amrani',    firstName: 'Nadia',   lastName: 'Amrani',    email: 'n.amrani@hps.ma',       role: 'USER',  status: 'ACTIVE',  projects: ['CDM'],        createdAt: '2024-06-18' },
  { id: 7, username: 'y.benali',    firstName: 'Youssef', lastName: 'Benali',    email: 'y.benali@switch.ma',    role: 'ADMIN', status: 'ACTIVE',  projects: ['AWB', 'CDM'], createdAt: '2024-07-22' },
  { id: 8, username: 'z.alaoui',    firstName: 'Zineb',   lastName: 'Alaoui',    email: 'z.alaoui@switch.ma',    role: 'USER',  status: 'BLOCKED', projects: [],             createdAt: '2024-08-30' },
];

const TEMP_PWD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';

function generateTemporaryPassword(): string {
  return Array.from(
    { length: 10 },
    () => TEMP_PWD_CHARS[Math.floor(Math.random() * TEMP_PWD_CHARS.length)],
  ).join('');
}

function parseProjects(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map(p => p.trim()).filter(Boolean);
  }
  return [];
}

function normalizeRole(raw: unknown): 'ADMIN' | 'USER' {
  const r = String(raw ?? '').trim().toUpperCase();
  return r === 'ADMIN' ? 'ADMIN' : 'USER';
}

function normalizeStatus(raw: unknown): 'ACTIVE' | 'BLOCKED' {
  const s = String(raw ?? '').trim().toUpperCase();
  return s === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE';
}

@Injectable({ providedIn: 'root' })
export class UserStoreService {
  private readonly http = inject(HttpClient);
  readonly users = signal<AppUser[]>([...MOCK_USERS]);

  constructor() {
    this.loadFromBackend();
  }

  loadFromBackend(): void {
    this.http.get<any[]>(`${API_BASE}/admin/users`).subscribe({
      next: list => {
        if (!list?.length) return;
        const backendUsers: AppUser[] = list.map(u => ({
          id:                u.id,
          username:          u.username          ?? '',
          firstName:         u.firstName         ?? '',
          lastName:          u.lastName          ?? '',
          email:             u.email             ?? '',
          role:              normalizeRole(u.role),
          status:            normalizeStatus(u.status),
          projects:          parseProjects(u.projects),
          createdAt:         u.createdAt         ?? '',
          mustChangePassword: u.mustChangePassword ?? false,
        }));
        this.users.set(backendUsers);
      },
      error: () => { /* backend non disponible → MOCK_USERS gardés */ },
    });
  }

  resetUserPassword(userId: number): { tempPassword: string } {
    const tempPassword = generateTemporaryPassword();
    this.users.update(list =>
      list.map(u =>
        u.id === userId
          ? { ...u, _password: tempPassword, mustChangePassword: true }
          : u,
      ),
    );
    return { tempPassword };
  }
}
