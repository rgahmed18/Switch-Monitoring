import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '../services/translate.service';

// pure: false  -  re-evaluates on every change-detection cycle so language
// switches are reflected immediately without needing async observables.
@Pipe({ name: 'translate', pure: false, standalone: true })
export class TranslatePipe implements PipeTransform {
  constructor(private translate: TranslateService) {}

  transform(key: string): string {
    return this.translate.t(key);
  }
}
