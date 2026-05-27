import { Router, Request, Response } from 'express';
import { AnyBulkWriteOperation } from 'mongoose';
import { EntityAttributeValueModel } from './entityAttributeValue.model';
import { AttributeDefinitionModel } from '../attribute-definitions/attributeDefinition.model';
import { success, error } from '../../utils/api-response';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permission';

export const entityAttributeValueRouter = Router();

entityAttributeValueRouter.use(authenticate);

entityAttributeValueRouter.get(
  '/:entityType/:entityId',
  requirePermission('admin.attributes.view'),
  async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;

    const definitions = await AttributeDefinitionModel.find({
      entityType,
      isActive: true,
    }).sort({ sortOrder: 1 });

    const values = await EntityAttributeValueModel.find({ entityType, entityId });

    const valueMap = new Map<string, unknown>();
    for (const v of values) {
      valueMap.set(v.attributeId, v.value);
    }

    const result = definitions.map((def) => ({
      _id: def._id,
      attributeId: def._id,
      name: def.name,
      label: def.label,
      type: def.type,
      unit: def.unit,
      options: def.options,
      required: def.required,
      sortOrder: def.sortOrder,
      value: valueMap.get(def._id.toString()) ?? null,
    }));

    res.json(success(result));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json(error(message));
  }
});

entityAttributeValueRouter.put(
  '/:entityType/:entityId',
  requirePermission('admin.attributes.edit'),
  async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const { values } = req.body as { values: { attributeId: string; value: unknown }[] };

    if (!Array.isArray(values)) {
      res.status(400).json(error('Body must contain "values" array'));
      return;
    }

    const defIds = new Set(
      (await AttributeDefinitionModel.find({ entityType }).select('_id')).map((d) =>
        d._id.toString(),
      ),
    );

    const invalid = values.filter((v) => !defIds.has(v.attributeId));
    if (invalid.length > 0) {
      res
        .status(400)
        .json(
          error(
            `Invalid attributeIds: ${invalid.map((v) => v.attributeId).join(', ')}`,
          ),
        );
      return;
    }

    const operations: AnyBulkWriteOperation[] = values.map((v) => ({
      updateOne: {
        filter: { entityType, entityId, attributeId: v.attributeId },
        update: { $set: { value: v.value } },
        upsert: true,
      },
    }));

    await EntityAttributeValueModel.bulkWrite(operations);

    const updated = await EntityAttributeValueModel.find({ entityType, entityId });
    res.json(success(updated, 'Attributes updated'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json(error(message));
  }
});
