import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-like-button',
  imports: [],
  template: `
    <button
      type="button"
      class="like-btn"
      [class.like-btn--liked]="liked()"
      [disabled]="disabled()"
      (click)="toggled.emit()"
      [attr.aria-label]="liked() ? 'remover curtida' : 'curtir'"
    >
      <i [class]="liked() ? 'ti ti-heart-filled' : 'ti ti-heart'"></i>
      @if (count() > 0) {
        <span class="like-btn__count">{{ count() }}</span>
      }
    </button>
  `,
  styles: [
    `
      .like-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 10px;
        border-radius: 20px;
        border: 0.5px solid var(--color-border);
        background: transparent;
        color: var(--color-text-muted);
        font-size: 13px;
        font-family: var(--font-body);
        cursor: pointer;
        transition: all 0.15s;

        i {
          font-size: 14px;
          transition: color 0.15s;
        }

        &:hover:not(:disabled) {
          border-color: #f87171;
          color: #f87171;
        }

        &--liked {
          border-color: rgba(248, 113, 113, 0.3);
          color: #f87171;
          background: rgba(248, 113, 113, 0.06);

          &:hover:not(:disabled) {
            background: rgba(248, 113, 113, 0.12);
          }
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      }

      .like-btn__count {
        font-size: 12px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LikeButton {
  readonly count = input<number>(0);
  readonly liked = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly toggled = output<void>();
}
