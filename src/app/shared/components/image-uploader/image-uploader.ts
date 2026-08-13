import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import type { FilePurpose } from '@xcorpiiion/canonico';
import { PendingUpload, StorageService } from '../../../core/services/storage.service';

/** Como a superfície se apresenta. Ver a nota no `variant`. */
export type ImageUploaderVariant = 'cover' | 'inline';

/**
 * Escolhe um arquivo, manda os bytes e devolve a chave.
 *
 * Não confirma o upload: quem usa o componente confirma depois de salvar a entidade,
 * porque é só aí que existe um id para amarrar o arquivo.
 *
 * O preview local é emitido junto com a chave de propósito. O arquivo ainda não
 * confirmado não tem URL de leitura, então a única forma de mostrá-lo é o blob — e se
 * ele vivesse só aqui dentro, fechar o painel destruiria o componente e a imagem
 * sumiria da tela mesmo estando salva no formulário. Quem chama guarda a URL.
 */
@Component({
  selector: 'app-image-uploader',
  templateUrl: './image-uploader.html',
  styleUrl: './image-uploader.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageUploader {
  readonly purpose = input.required<FilePurpose>();
  readonly label = input<string>('Imagem');
  readonly hint = input<string>('PNG, JPG ou WebP · até 5 MB');
  /** URL já resolvida de uma imagem existente, ao editar. */
  readonly currentUrl = input<string | null>(null);
  /**
   * `cover` preenche a altura disponível — serve para a capa, que fica ao lado da
   * descrição. `inline` é miniatura com botão ao lado, para painel estreito, onde um
   * quadrado grande tomaria a coluna inteira.
   */
  readonly variant = input<ImageUploaderVariant>('cover');

  readonly uploaded = output<PendingUpload>();
  readonly cleared = output<void>();

  private readonly storage = inject(StorageService);

  protected readonly localPreview = signal<string | null>(null);
  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected preview(): string | null {
    return this.localPreview() ?? this.currentUrl();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    // Sem isto, escolher o mesmo arquivo depois de um erro não dispara o change.
    input.value = '';

    const problem = this.storage.validateImage(file);
    if (problem) {
      this.error.set(problem);
      return;
    }

    this.error.set(null);
    this.uploading.set(true);
    this.storage.upload(file, this.purpose()).subscribe({
      next: (pending) => {
        this.localPreview.set(pending.previewUrl);
        this.uploading.set(false);
        this.uploaded.emit(pending);
      },
      error: () => {
        this.uploading.set(false);
        this.error.set('Não foi possível enviar a imagem. Tente novamente.');
      },
    });
  }

  protected clear(): void {
    // Não damos revokeObjectURL na blob descartada: quem chamou pode ter guardado essa
    // mesma URL para redesenhar a imagem depois, e revogar aqui a apagaria da tela. O
    // custo é a blob sobreviver até a página recarregar; o alívio é não mostrar imagem
    // quebrada, que era o sintoma que essa troca resolve.
    this.localPreview.set(null);
    this.error.set(null);
    this.cleared.emit();
  }

  /** Id próprio para o botão secundário do modo inline apontar para o mesmo input. */
  protected readonly inputId = `img-up-${Math.random().toString(36).slice(2, 9)}`;
}
