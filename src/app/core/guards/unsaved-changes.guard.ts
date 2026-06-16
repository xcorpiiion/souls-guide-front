import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmService } from '../services/confirm.service';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) return true;

  const confirm = inject(ConfirmService);
  return confirm.ask({
    title: 'Alterações não salvas',
    message: 'Você tem alterações que não foram salvas. Deseja sair mesmo assim?',
    confirmLabel: 'Sair sem salvar',
    cancelLabel: 'Continuar editando',
  });
};
