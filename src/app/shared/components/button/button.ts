import { ChangeDetectionStrategy, Component, booleanAttribute, input, output } from '@angular/core';

export type ButtonVariant = 'solid' | 'outline' | 'ghost';
export type ButtonColor   = 'gold' | 'ember' | 'neutral' | 'danger';
export type ButtonSize    = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  templateUrl: './button.html',
  styleUrl: './button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Button {
  readonly variant  = input<ButtonVariant>('solid');
  readonly color    = input<ButtonColor>('gold');
  readonly size     = input<ButtonSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly clicked = output<void>();

  private cooldown = false;

  protected onClick(): void {
    if (this.disabled() || this.cooldown) return;
    this.clicked.emit();
    this.cooldown = true;
    setTimeout(() => (this.cooldown = false), 200);
  }

  protected get classes(): string {
    return [
      'btn',
      `btn--${this.variant()}`,
      `btn--${this.color()}`,
      `btn--${this.size()}`,
    ].join(' ');
  }
}
