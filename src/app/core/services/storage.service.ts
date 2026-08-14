import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import type {
  ConfirmUploadRequest,
  FileMetadata,
  FilePurpose,
  UploadTicket,
  UploadTicketRequest,
} from '@xcorpiiion/canonico';
import { environment } from '../../../environments/environment';
import { skipAuth } from '@xcorpiiion/ng-core';

/** A que entidade um arquivo pertence. Casa com o ownerKind gravado na storage-api. */
export type FileOwnerKind = 'QUEST' | 'LORE' | 'GAME';

/**
 * Arquivo que já subiu mas ainda não foi confirmado. Enquanto está assim ele não tem
 * URL de leitura, por isso o preview usa um blob local.
 */
export interface PendingUpload {
  fileKey: string;
  previewUrl: string;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apis.storage}/files`;

  /** Recusa cedo o que a política do servidor recusaria, para não gastar ida e volta. */
  validateImage(file: File): string | null {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return 'Formato não aceito. Use PNG, JPG ou WebP.';
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return 'Imagem muito grande. O limite é 5 MB.';
    }
    return null;
  }

  /**
   * Pede autorização, manda os bytes direto para o bucket e devolve a chave.
   *
   * Não confirma: na criação a quest ou o artigo ainda não tem id, e é o id que amarra
   * o arquivo à entidade. Quem chamou confirma depois de salvar, com {@link confirm}.
   * Se desistir, o registro fica pendente e a limpeza de órfãos recolhe sozinha.
   */
  upload(file: File, purpose: FilePurpose): Observable<PendingUpload> {
    const request: UploadTicketRequest = {
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      purpose,
    };

    return this.http.post<UploadTicket>(`${this.base}/tickets`, request).pipe(
      switchMap((ticket) =>
        this.http
          .request(ticket.httpMethod, ticket.uploadUrl, {
            body: file,
            // A assinatura cobre exatamente estes cabeçalhos: mandar outros invalida a URL.
            headers: ticket.requiredHeaders,
            context: skipAuth(),
            responseType: 'text',
          })
          .pipe(map(() => ({ fileKey: ticket.fileKey, previewUrl: URL.createObjectURL(file) }))),
      ),
    );
  }

  /** Libera o arquivo para uso e o amarra à entidade que acabou de ser salva. */
  confirm(fileKey: string, ownerKind: FileOwnerKind, ownerId: string): Observable<FileMetadata> {
    const body: ConfirmUploadRequest = { ownerKind, ownerId };
    return this.http.post<FileMetadata>(`${this.base}/${fileKey}/confirm`, body);
  }

  /** Confirma vários de uma vez; um que falhe não derruba os outros. */
  confirmAll(
    fileKeys: readonly string[],
    ownerKind: FileOwnerKind,
    ownerId: string,
  ): Observable<void> {
    const pending = fileKeys.filter((k) => !!k);
    if (!pending.length) return of(undefined);
    return forkJoin(
      pending.map((key) => this.confirm(key, ownerKind, ownerId).pipe(catchError(() => of(null)))),
    ).pipe(map(() => undefined));
  }

  /**
   * Resolve chaves em URLs de leitura.
   *
   * Uma listagem por dono cobre a página inteira numa chamada só. O que sobrar é buscado
   * chave a chave — é o caso do conteúdo copiado para o perfil, cujos arquivos continuam
   * pertencendo ao original e por isso não aparecem na listagem do dono novo.
   */
  resolve(
    fileKeys: readonly string[],
    ownerKind: FileOwnerKind,
    ownerId: string,
  ): Observable<Map<string, string>> {
    const wanted = new Set(fileKeys.filter((k) => !!k));
    if (!wanted.size) return of(new Map());

    return this.listByOwner(ownerKind, ownerId).pipe(
      switchMap((byOwner) => {
        const resolved = new Map<string, string>();
        for (const file of byOwner) {
          if (wanted.has(file.fileKey) && file.url) resolved.set(file.fileKey, file.url);
        }

        const missing = [...wanted].filter((key) => !resolved.has(key));
        if (!missing.length) return of(resolved);

        return forkJoin(missing.map((key) => this.findByKey(key))).pipe(
          map((extras) => {
            for (const file of extras) {
              if (file?.url) resolved.set(file.fileKey, file.url);
            }
            return resolved;
          }),
        );
      }),
    );
  }

  /** Uma chave só, sem contexto de dono. Devolve null quando não dá para exibir. */
  findByKey(fileKey: string): Observable<FileMetadata | null> {
    return this.http.get<FileMetadata>(`${this.base}/${fileKey}`).pipe(catchError(() => of(null)));
  }

  remove(fileKey: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${fileKey}`).pipe(catchError(() => of(undefined)));
  }

  /**
   * Apaga arquivos que a entidade deixou de referenciar, para não acumular lixo.
   *
   * Só apaga o que é da própria entidade. Conteúdo copiado para o perfil aponta para o
   * mesmo arquivo do original: apagar na troca da cópia deixaria o artigo de origem com
   * a imagem quebrada. Arquivo sem dono é upload desta sessão que nunca foi confirmado,
   * e esse pode ir embora na hora em vez de esperar a limpeza de órfãos.
   *
   * Chame depois que o salvamento deu certo — antes disso o usuário ainda pode desistir,
   * e aí a entidade continuaria apontando para um arquivo que já não existe.
   */
  discard(
    fileKeys: readonly string[],
    ownerKind: FileOwnerKind,
    ownerId: string,
  ): Observable<void> {
    const keys = [...new Set(fileKeys.filter((k) => !!k))];
    if (!keys.length) return of(undefined);

    return forkJoin(
      keys.map((key) =>
        this.findByKey(key).pipe(
          switchMap((file) => {
            if (!file) return of(undefined);

            const semDono = !file.ownerKind && !file.ownerId;
            const desteDono = file.ownerKind === ownerKind && file.ownerId === ownerId;
            if (!semDono && !desteDono) return of(undefined);

            return this.remove(key);
          }),
          catchError(() => of(undefined)),
        ),
      ),
    ).pipe(map(() => undefined));
  }

  private listByOwner(ownerKind: FileOwnerKind, ownerId: string): Observable<FileMetadata[]> {
    return this.http
      .get<FileMetadata[]>(this.base, { params: { ownerKind, ownerId } })
      .pipe(catchError(() => of([])));
  }
}
