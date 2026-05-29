/** Blog, FAQ, community forum reads + moderated writes (PRD §8.9, §14.2). */
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { slugify } from '../utils/slugify';

export const contentService = {
  // ── Blog ──
  async listPosts(skip: number, take: number, category?: string, tag?: string) {
    const where = {
      status: 'published' as const,
      ...(category ? { category } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
    };
    const [items, totalCount] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take,
        select: { title: true, slug: true, excerpt: true, coverImageUrl: true, category: true, tags: true, publishedAt: true },
      }),
      prisma.blogPost.count({ where }),
    ]);
    return { items, totalCount };
  },

  async getPost(slug: string) {
    const post = await prisma.blogPost.findFirst({ where: { slug, status: 'published' }, include: { author: { select: { firstName: true, lastName: true } } } });
    if (!post) throw AppError.notFound('POST_NOT_FOUND', 'Blog post not found.');
    return post;
  },

  // ── FAQ ──
  async getFaq() {
    const entries = await prisma.faqEntry.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    const grouped: Record<string, { question: string; answer: string }[]> = {};
    for (const e of entries) {
      const key = e.categoryName ?? 'General';
      (grouped[key] ??= []).push({ question: e.question, answer: e.answer });
    }
    return grouped;
  },

  // ── Community forum ──
  async listThreads(skip: number, take: number, category?: string) {
    const where = { status: 'published' as const, ...(category ? { category } : {}) };
    const [items, totalCount] = await Promise.all([
      prisma.forumThread.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
        include: { author: { select: { firstName: true, lastName: true } } },
      }),
      prisma.forumThread.count({ where }),
    ]);
    return { items, totalCount };
  },

  async getThread(slug: string) {
    const thread = await prisma.forumThread.findFirst({
      where: { slug, status: 'published' },
      include: {
        author: { select: { firstName: true, lastName: true } },
        replies: { where: { status: 'published' }, orderBy: { createdAt: 'asc' }, include: { author: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!thread) throw AppError.notFound('THREAD_NOT_FOUND', 'Thread not found.');
    await prisma.forumThread.update({ where: { id: thread.id }, data: { viewCount: { increment: 1 } } });
    return thread;
  },

  async createThread(userId: number, data: { title: string; body: string; category?: string }) {
    const slug = `${slugify(data.title)}-${Date.now().toString(36)}`;
    return prisma.forumThread.create({
      data: { authorId: userId, title: data.title, body: data.body, category: data.category, slug, status: 'pending' },
    });
  },

  async createReply(userId: number, threadId: number, body: string) {
    const thread = await prisma.forumThread.findUnique({ where: { id: threadId } });
    if (!thread || thread.status !== 'published') throw AppError.notFound('THREAD_NOT_FOUND', 'Thread not found.');
    return prisma.forumReply.create({ data: { threadId, authorId: userId, body, status: 'pending' } });
  },
};
