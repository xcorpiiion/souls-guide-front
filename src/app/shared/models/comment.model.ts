import type { CommentResponse, CreateCommentRequest } from '@xcorpiiion/canonico';

// Shapes da API — fonte da verdade: lib canonico
export type Comment = CommentResponse;

// O service injeta targetKind/targetId a partir do contexto do componente
export type CommentRequest = Omit<CreateCommentRequest, 'targetKind' | 'targetId'>;
