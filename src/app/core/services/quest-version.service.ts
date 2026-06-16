import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VersionAuthor {
  userId: number;
  nickname: string;
}

export interface VersionDiff {
  titleOld: string | null;
  titleNew: string | null;
  descriptionOld: string | null;
  descriptionNew: string | null;
  statusOld: string | null;
  statusNew: string | null;
  nodesAdded: number;
  nodesRemoved: number;
}

export type VersionStatus = 'current' | 'active' | 'reverted';

export interface QuestVersion {
  versionNumber: number;
  questId: number;
  editedBy: VersionAuthor;
  editedAt: string;
  status: VersionStatus;
  diff: VersionDiff;
  revertVotes: number;
  revertVotesNeeded: number;
  userHasVoted: boolean;
  revertedFromVersion: number | null;
  strikeIssued: boolean;
  revertedBy: string | null;
  revertReason: 'votes' | null;
}

@Injectable({ providedIn: 'root' })
export class QuestVersionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apis.soulsGuide}/quests`;

  list(questId: string): Observable<QuestVersion[]> {
    return this.http.get<QuestVersion[]>(`${this.base}/${questId}/versions`);
  }

  revert(questId: string, versionNumber: number): Observable<QuestVersion> {
    return this.http.post<QuestVersion>(
      `${this.base}/${questId}/versions/${versionNumber}/revert`,
      {},
    );
  }

  voteRevert(questId: string): Observable<QuestVersion> {
    return this.http.post<QuestVersion>(`${this.base}/${questId}/versions/current/vote-revert`, {});
  }

  removeVoteRevert(questId: string): Observable<QuestVersion> {
    return this.http.delete<QuestVersion>(`${this.base}/${questId}/versions/current/vote-revert`);
  }
}
