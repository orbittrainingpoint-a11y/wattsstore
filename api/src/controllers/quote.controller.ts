/** Customer RFQ HTTP layer (PRD §8.6). */
import { Request, Response } from 'express';
import { quoteService } from '../services/quote.service';
import { ok, created, paginated, parsePagination } from '../utils/response';

export const quoteController = {
  async getBasket(req: Request, res: Response) {
    return ok(res, await quoteService.getBasket(req.user!.id));
  },
  async addItem(req: Request, res: Response) {
    const { variantId, targetQuantity, customerRemarks } = req.body;
    return ok(res, await quoteService.addItem(req.user!.id, req.context, variantId, targetQuantity, customerRemarks));
  },
  async updateItem(req: Request, res: Response) {
    return ok(res, await quoteService.updateItem(req.user!.id, Number(req.params.variantId), req.body));
  },
  async removeItem(req: Request, res: Response) {
    return ok(res, await quoteService.removeItem(req.user!.id, Number(req.params.variantId)));
  },
  async clearBasket(req: Request, res: Response) {
    return ok(res, await quoteService.clearBasket(req.user!.id));
  },
  async submit(req: Request, res: Response) {
    return created(res, await quoteService.submitRFQ(req.user!.id, req.context, req.body));
  },
  async list(req: Request, res: Response) {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { items, totalCount } = await quoteService.listForUser(req.user!.id, skip, limit);
    return paginated(res, items, { page, limit, totalCount });
  },
  async detail(req: Request, res: Response) {
    return ok(res, await quoteService.getForUser(req.params.refNumber, req.user!.id));
  },
  async download(req: Request, res: Response) {
    const { url } = await quoteService.downloadForUser(req.params.refNumber, req.user!.id);
    return res.redirect(url);
  },
  async accept(req: Request, res: Response) {
    return created(res, await quoteService.accept(req.params.refNumber, req.user!.id));
  },
  async reject(req: Request, res: Response) {
    return ok(res, await quoteService.reject(req.params.refNumber, req.user!.id, req.body.reason));
  },
};
