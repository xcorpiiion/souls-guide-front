import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type CopyContentType = 'quest' | 'lore';

export interface CopyConfirmEvent {
  replaceExistingId?: number;
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

  protected onConfirm(): void {
    this.confirm.emit({
      replaceExistingId: this.hasConflict() ? this.conflictId() : undefined,
    });
  }
}
