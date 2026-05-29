/** Cart HTTP layer (PRD §8.3). All routes auth-required. */
import { Request, Response } from 'express';
import { cartService } from '../services/cart.service';
import { ok } from '../utils/response';

export const cartController = {
  async get(req: Request, res: Response) {
    return ok(res, await cartService.getCart(req.user!.id, req.context));
  },
  async addItem(req: Request, res: Response) {
    const { variantId, quantity } = req.body;
    return ok(res, await cartService.addItem(req.user!.id, req.context, variantId, quantity));
  },
  async updateItem(req: Request, res: Response) {
    return ok(res, await cartService.updateQuantity(req.user!.id, req.context, Number(req.params.variantId), req.body.quantity));
  },
  async removeItem(req: Request, res: Response) {
    return ok(res, await cartService.removeItem(req.user!.id, req.context, Number(req.params.variantId)));
  },
  async clear(req: Request, res: Response) {
    return ok(res, await cartService.clear(req.user!.id, req.context));
  },
  async applyCoupon(req: Request, res: Response) {
    return ok(res, await cartService.applyCoupon(req.user!.id, req.context, req.body.code));
  },
  async removeCoupon(req: Request, res: Response) {
    return ok(res, await cartService.removeCoupon(req.user!.id, req.context));
  },
};
