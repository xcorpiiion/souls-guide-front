import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Comment } from '../../models/comment.model';
import { CommentService, CommentTargetKind } from '../../../core/services/comment.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-comment-section',
  imports: [FormsModule, RouterLink],
  templateUrl: './comment-section.html',
  styleUrl: './comment-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentSection implements OnInit {
  readonly targetKind = input.required<CommentTargetKind>();
  readonly targetId = input.required<string>();

  private readonly commentService = inject(CommentService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly auth = inject(AuthService);

  protected readonly comments = signal<Comment[]>([]);
  protected readonly loading = signal(true);

  protected readonly composeText = signal('');
  protected readonly composeSpoiler = signal(false);
  protected readonly submitting = signal(false);

  protected readonly replyingToId = signal<string | null>(null);
  protected readonly replyingToHandle = signal<string | null>(null);
  protected readonly replyText = signal('');
  protected readonly replySpoiler = signal(false);
  protected readonly submittingReply = signal(false);

  protected readonly revealedSpoilers = signal<Set<string>>(new Set());

  protected readonly authorInitial = computed(() => {
    const email = this.auth.getEmail() ?? '';
    return email[0]?.toUpperCase() ?? '?';
  });

  protected readonly totalCount = computed(() =>
    this.comments().reduce((acc, c) => acc + 1 + c.replies.length, 0),
  );

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.commentService.list(this.targetKind(), this.targetId()).subscribe({
      next: (list) => {
        this.comments.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected submit(): void {
    const content = this.composeText().trim();
    if (!content || this.submitting()) return;
    this.submitting.set(true);
    this.commentService
      .add(this.targetKind(), this.targetId(), { content, isSpoiler: this.composeSpoiler() })
      .subscribe({
        next: (c) => {
          this.comments.update((list) => [{ ...c, replies: [] }, ...list]);
          this.composeText.set('');
          this.composeSpoiler.set(false);
          this.submitting.set(false);
        },
        error: () => this.submitting.set(false),
      });
  }

  protected submitReply(parentId: string): void {
    const content = this.replyText().trim();
    if (!content || this.submittingReply()) return;
    this.submittingReply.set(true);
    this.commentService
      .add(this.targetKind(), this.targetId(), {
        content,
        isSpoiler: this.replySpoiler(),
        parentId,
      })
      .subscribe({
        next: (reply) => {
          this.comments.update((list) =>
            list.map((c) => (c.id === parentId ? { ...c, replies: [...c.replies, reply] } : c)),
          );
          this.replyText.set('');
          this.replySpoiler.set(false);
          this.replyingToId.set(null);
          this.submittingReply.set(false);
        },
        error: () => this.submittingReply.set(false),
      });
  }

  protected toggleLike(comment: Comment, parentId?: string): void {
    const action = comment.userHasLiked
      ? this.commentService.unlike(comment.id)
      : this.commentService.like(comment.id);
    action.subscribe({
      next: (res) => this.patchComment(comment.id, res, parentId),
      error: () => {
        /* swallowed intentionally */
      },
    });
  }

  protected deleteComment(commentId: string, parentId?: string): void {
    this.commentService.delete(commentId).subscribe({
      next: () => {
        if (parentId) {
          this.comments.update((list) =>
            list.map((c) =>
              c.id === parentId
                ? { ...c, replies: c.replies.filter((r) => r.id !== commentId) }
                : c,
            ),
          );
        } else {
          this.comments.update((list) => list.filter((c) => c.id !== commentId));
        }
      },
      error: () => {
        /* swallowed intentionally */
      },
    });
  }

  protected openReply(id: string, authorHandle: string): void {
    if (this.replyingToId() === id) {
      this.replyingToId.set(null);
      this.replyingToHandle.set(null);
      this.replyText.set('');
      return;
    }
    this.replyingToId.set(id);
    this.replyingToHandle.set(authorHandle);
    this.replyText.set(`@${authorHandle} `);
    this.replySpoiler.set(false);
  }

  protected revealSpoiler(id: string): void {
    this.revealedSpoilers.update((s) => new Set([...s, id]));
  }

  protected isSpoilerHidden(c: Comment): boolean {
    return c.isSpoiler && !this.revealedSpoilers().has(c.id);
  }

  protected daysLabel(d: number): string {
    if (d === 0) return 'hoje';
    if (d === 1) return 'ontem';
    if (d < 7) return `há ${d} dias`;
    if (d < 30) return `há ${Math.round(d / 7)} sem`;
    return `há ${Math.round(d / 30)} meses`;
  }

  protected renderContent(content: string): SafeHtml {
    const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = escaped.replace(
      /@([\w.]+)/g,
      '<a class="cs__mention" href="/usuarios/$1">@$1</a>',
    );
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  protected isOwn(comment: Comment): boolean {
    return this.auth.getEmail() !== null && comment.authorHandle === this.auth.getEmail();
  }

  private patchComment(
    id: string,
    patch: { likeCount: number; userHasLiked: boolean },
    parentId?: string,
  ): void {
    this.comments.update((list) =>
      list.map((c) => {
        if (!parentId && c.id === id) return { ...c, ...patch };
        if (parentId && c.id === parentId) {
          return {
            ...c,
            replies: c.replies.map((r) => (r.id === id ? { ...r, ...patch } : r)),
          };
        }
        return c;
      }),
    );
  }
}
