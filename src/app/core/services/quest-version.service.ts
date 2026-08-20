import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { Observable } from 'rxjs';
import { QuestNode, QuestEdge } from '../../shared/models/quest.model';

export interface QuestVersionSnapshot {
  versionNumber: number;
  title: string;
  description: string | null;
  nodes: QuestNode[];
  edges: QuestEdge[];
}

export interface VersionAuthor {
  userId: number;
  nickname: string;
}

export interface VersionDiff {
  titleOld: string | null;
  titleNew: string | null;
  descriptionOld: string | null;
  descriptionNew: string | null;
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
  private readonly api = inject(HttpService).resource('quests');

  list(questId: string): Observable<QuestVersion[]> {
    return this.api.get<QuestVersion[]>(`${questId}/versions`);
  }

  revert(questId: string, versionNumber: number): Observable<QuestVersion> {
    return this.api.post<QuestVersion>(`${questId}/versions/${versionNumber}/revert`, {});
  }

  voteRevert(questId: string): Observable<QuestVersion> {
    return this.api.post<QuestVersion>(`${questId}/versions/current/vote-revert`, {});
  }

  removeVoteRevert(questId: string): Observable<QuestVersion> {
    return this.api.delete<QuestVersion>(`${questId}/versions/current/vote-revert`);
  }

  getSnapshot(questId: string, versionNumber: number): Observable<QuestVersionSnapshot> {
    return this.api.get<QuestVersionSnapshot>(`${questId}/versions/${versionNumber}/snapshot`);
  }
}
