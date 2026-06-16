export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  content: string;
  isSpoiler: boolean;
  likeCount: number;
  userHasLiked: boolean;
  createdAt: string;
  daysAgo: number;
  replies: Comment[];
}

export interface CommentRequest {
  content: string;
  isSpoiler: boolean;
  parentId?: string;
}
