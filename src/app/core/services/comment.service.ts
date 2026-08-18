import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { Observable } from 'rxjs';
import { Comment, CommentRequest } from '../../shared/models/comment.model';

export type CommentTargetKind = 'quest' | 'lore';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly api = inject(HttpService).resource('comments');

  list(targetKind: CommentTargetKind, targetId: string): Observable<Comment[]> {
    return this.api.get<Comment[]>('', { targetKind, targetId });
  }

  add(
    targetKind: CommentTargetKind,
    targetId: string,
    request: CommentRequest,
  ): Observable<Comment> {
    return this.api.post<Comment>('', { ...request, targetKind, targetId });
  }

  like(commentId: string): Observable<{ likeCount: number; userHasLiked: boolean }> {
    return this.api.post<{ likeCount: number; userHasLiked: boolean }>(`${commentId}/like`);
  }

  unlike(commentId: string): Observable<{ likeCount: number; userHasLiked: boolean }> {
    return this.api.delete<{ likeCount: number; userHasLiked: boolean }>(`${commentId}/like`);
  }

  delete(commentId: string): Observable<void> {
    return this.api.delete<void>(commentId);
  }
}
