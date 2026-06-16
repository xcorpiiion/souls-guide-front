import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  template: `
    <div class="cm-backdrop" role="presentation" (click)="onCancel()" (keydown.escape)="onCancel()">
      <div
        class="cm-dialog"
        role="dialog"
        aria-modal="true"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
      >
        <div class="cm-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 class="cm-title">{{ title }}</h2>
        <p class="cm-message">{{ message }}</p>
        <div class="cm-actions">
          <button class="cm-btn cm-btn--ghost" type="button" (click)="onCancel()">
            {{ cancelLabel }}
          </button>
          <button class="cm-btn cm-btn--danger" type="button" (click)="onConfirm()">
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .cm-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: cm-fade-in 0.15s ease;
      }

      .cm-dialog {
        background: #1a1a1a;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 32px 28px 24px;
        width: 100%;
        max-width: 380px;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        animation: cm-slide-up 0.2s ease;
      }

      .cm-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 4px;
        color: #ef4444;

        svg {
          width: 24px;
          height: 24px;
        }
      }

      .cm-title {
        font-size: 16px;
        font-weight: 600;
        color: #f5f5f5;
        margin: 0;
        text-align: center;
      }

      .cm-message {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.5);
        margin: 0;
        text-align: center;
        line-height: 1.6;
      }

      .cm-actions {
        display: flex;
        gap: 10px;
        margin-top: 16px;
        width: 100%;
      }

      .cm-btn {
        flex: 1;
        padding: 9px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition:
          background 0.15s,
          border-color 0.15s;

        &--ghost {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.7);

          &:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.2);
          }
        }

        &--danger {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;

          &:hover {
            background: rgba(239, 68, 68, 0.25);
            border-color: rgba(239, 68, 68, 0.6);
          }
        }
      }

      @keyframes cm-fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes cm-slide-up {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmModal {
  @Input() title = 'Tem certeza?';
  @Input() message = 'Esta ação não pode ser desfeita.';
  @Input() confirmLabel = 'Confirmar';
  @Input() cancelLabel = 'Cancelar';

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }
  onCancel(): void {
    this.cancelled.emit();
  }
}
