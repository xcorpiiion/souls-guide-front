import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apis.soulsGuide}/lore`;

  list(loreId: string): Observable<LoreVersion[]> {
    return this.http.get<LoreVersion[]>(`${this.base}/${loreId}/versions`);
  }

  revert(loreId: string, versionNumber: number): Observable<LoreVersion> {
    return this.http.post<LoreVersion>(
      `${this.base}/${loreId}/versions/${versionNumber}/revert`,
      {},
    );
  }

  voteRevert(loreId: string): Observable<LoreVersion> {
    return this.http.post<LoreVersion>(`${this.base}/${loreId}/versions/current/vote-revert`, {});
  }

  removeVoteRevert(loreId: string): Observable<LoreVersion> {
    return this.http.delete<LoreVersion>(`${this.base}/${loreId}/versions/current/vote-revert`);
  }
}
