import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Comment, CommentRequest } from '../../shared/models/comment.model';

export type CommentTargetKind = 'quest' | 'lore';

const BASE = `${environment.apis.soulsGuide}/comments`;

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly http = inject(HttpClient);

  list(targetKind: CommentTargetKind, targetId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(BASE, { params: { targetKind, targetId } });
  }

  add(
    targetKind: CommentTargetKind,
    targetId: string,
    request: CommentRequest,
  ): Observable<Comment> {
    return this.http.post<Comment>(BASE, { ...request, targetKind, targetId });
  }

  like(commentId: string): Observable<{ likeCount: number; userHasLiked: boolean }> {
    return this.http.post<{ likeCount: number; userHasLiked: boolean }>(
      `${BASE}/${commentId}/like`,
      null,
    );
  }

  unlike(commentId: string): Observable<{ likeCount: number; userHasLiked: boolean }> {
    return this.http.delete<{ likeCount: number; userHasLiked: boolean }>(
      `${BASE}/${commentId}/like`,
    );
  }

  delete(commentId: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/${commentId}`);
  }
}
