import { inject, provideAppInitializer } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

export function provideAuthInitializer() {
  return provideAppInitializer(() => firstValueFrom(inject(AuthService).restoreSession()));
}
