import { Injectable, computed } from '@angular/core';
import { AppStateService } from '../state.service';
import { TRANSLATIONS } from '../data/translations';

@Injectable({ providedIn: 'root' })
export class TranslateService {
  constructor(private appState: AppStateService) {}

  // Reactive: reads the lang signal so computed() and pure:false pipes track it
  t(key: string): string {
    const lang = this.appState.lang();
    return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['fr']?.[key] ?? key;
  }

  // Convenience computed for components that need a reactive translation
  c(key: string) {
    return computed(() => this.t(key));
  }
}
