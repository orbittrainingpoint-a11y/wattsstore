/** Customer order HTTP layer (PRD §8.4). */
import { Request, Response } from 'express';
import { orderService } from '../services/order.service';
import { ok, paginated, parsePagination } from '../utils/response';

export const orderController = {
  async list(req: Request, res: Response) {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { items, totalCount } = await orderService.listForUser(req.user!.id, skip, limit);
    return paginated(res, items, { page, limit, totalCount });
  },
  async detail(req: Request, res: Response) {
    return ok(res, await orderService.getForUser(req.params.orderNumber, req.user!.id));
  },
  async cancel(req: Request, res: Response) {
    const orderNumber = await orderService.requestCancellation(req.params.orderNumber, req.user!.id);
    return ok(res, { orderNumber, status: 'cancelled' });
  },
};
