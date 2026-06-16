import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CopyLoreFilterType } from '../../../core/services/personal-lore.service';

export type CopyContentType = 'quest' | 'lore';

export interface CopyConfirmEvent {
  replaceExistingId?: number;
  filterType?: CopyLoreFilterType;
}

@Component({
  selector: 'app-copy-to-profile-modal',
  imports: [],
  templateUrl: './copy-to-profile-modal.html',
  styleUrl: './copy-to-profile-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyToProfileModal {
  readonly contentType = input<CopyContentType>('quest');
  readonly hasConflict = input<boolean>(false);
  readonly conflictId = input<number | undefined>(undefined);
  readonly saving = input<boolean>(false);

  readonly confirm = output<CopyConfirmEvent>();
  readonly dismissed = output<void>();

  protected readonly loreFilter = signal<CopyLoreFilterType>('all');

  protected onConfirm(): void {
    this.confirm.emit({
      replaceExistingId: this.hasConflict() ? this.conflictId() : undefined,
      filterType: this.contentType() === 'lore' ? this.loreFilter() : undefined,
    });
  }
}
