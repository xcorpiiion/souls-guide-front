import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { Observable } from 'rxjs';

export interface LoreVersionAuthor {
  userId: number;
  nickname: string;
}

export interface LoreVersionDiff {
  titleOld: string | null;
  titleNew: string | null;
  contentChanged: boolean;
  contentPreviewOld: string | null;
  contentPreviewNew: string | null;
}

export interface LoreVersion {
  versionNumber: number;
  loreId: number;
  editedBy: LoreVersionAuthor;
  editedAt: string;
  status: 'current' | 'active' | 'reverted';
  diff: LoreVersionDiff;
  revertVotes: number;
  revertVotesNeeded: number;
  userHasVoted: boolean;
  revertedFromVersion: number | null;
  strikeIssued: boolean;
  revertedBy: string | null;
  revertReason: 'votes' | null;
}

@Injectable({ providedIn: 'root' })
export class LoreVersionService {
  private readonly api = inject(HttpService).resource('lore');

  list(loreId: string): Observable<LoreVersion[]> {
    return this.api.get<LoreVersion[]>(`${loreId}/versions`);
  }

  revert(loreId: string, versionNumber: number): Observable<LoreVersion> {
    return this.api.post<LoreVersion>(`${loreId}/versions/${versionNumber}/revert`, {});
  }

  voteRevert(loreId: string): Observable<LoreVersion> {
    return this.api.post<LoreVersion>(`${loreId}/versions/current/vote-revert`, {});
  }

  removeVoteRevert(loreId: string): Observable<LoreVersion> {
    return this.api.delete<LoreVersion>(`${loreId}/versions/current/vote-revert`);
  }
}
