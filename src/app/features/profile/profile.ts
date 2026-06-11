import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuestDetailData, QuestStatus } from '../../shared/models/quest.model';
import { buildMiniGraph } from '../../shared/utils/mini-graph';
import { QUESTS_DETAIL } from '../quest-detail/quest-detail.mocks';
import { MY_PROFILE } from './profile.mocks';

type ProfileTab = 'quests' | 'seguindo' | 'favoritos';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, LowerCasePipe],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  protected readonly profile = MY_PROFILE;
  protected readonly activeTab = signal<ProfileTab>('quests');

  protected readonly myQuests = computed(() =>
    QUESTS_DETAIL.filter((q) => this.profile.myQuestIds.includes(q.id)),
  );

  protected readonly followedQuests = computed(() =>
    QUESTS_DETAIL.filter((q) => this.profile.followedQuestIds.includes(q.id)),
  );

  protected miniGraph(quest: QuestDetailData) {
    return buildMiniGraph(quest);
  }

  protected statusLabel(s: QuestStatus): string {
    return ({ TEORIA: 'teoria', CONSOLIDADO: 'consolidado', CANONICO: 'canônico' } as const)[s];
  }

  protected activityLabel(type: string): string {
    return (
      (
        { created: 'Criou', updated: 'Atualizou', followed: 'Começou a seguir' } as Record<
          string,
          string
        >
      )[type] ?? type
    );
  }

  protected activityDot(type: string): string {
    return (
      (
        { created: 'dot--green', updated: 'dot--gold', followed: 'dot--blue' } as Record<
          string,
          string
        >
      )[type] ?? 'dot--gray'
    );
  }

  protected daysLabel(d: number): string {
    if (d === 0) return 'hoje';
    if (d === 1) return 'ontem';
    if (d < 7) return `há ${d} dias`;
    return `há ${Math.round(d / 7)} sem`;
  }

  protected readonly gameIconColor: Record<string, string> = {
    'elden-ring': 'game-icon--gold',
    bloodborne: 'game-icon--purple',
    'dark-souls-3': 'game-icon--blue',
  };
}
