import { Router, Request, Response } from 'express';
import { AnyBulkWriteOperation } from 'mongoose';
import { EntityAttributeValueModel } from './entityAttributeValue.model';
import { AttributeDefinitionModel } from '../attribute-definitions/attributeDefinition.model';
import { success, error } from '../../utils/api-response';
import { authenticate } from '../../middleware/auth';

export const entityAttributeValueRouter = Router();

// All routes require auth
entityAttributeValueRouter.use(authenticate);

/**
 * GET /:entityType/:entityId
 * Returns all attribute values for a given entity, merged with attribute definitions.
 */
entityAttributeValueRouter.get('/:entityType/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;

    // Get all definitions for this entity type
    const definitions = await AttributeDefinitionModel.find({
      entityType,
      isActive: true,
    }).sort({ sortOrder: 1 });

    // Get existing values for this entity
    const values = await EntityAttributeValueModel.find({ entityType, entityId });

    // Build a map of attributeId -> value
    const valueMap = new Map<string, unknown>();
    for (const v of values) {
      valueMap.set(v.attributeId, v.value);
    }

    // Merge definitions with values
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

/**
 * PUT /:entityType/:entityId
 * Bulk-update attribute values for an entity.
 * Body: { values: Array<{ attributeId: string, value: any }> }
 */
entityAttributeValueRouter.put('/:entityType/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const { values } = req.body as { values: Array<{ attributeId: string; value: unknown }> };

    if (!Array.isArray(values)) {
      res.status(400).json(error('Body must contain "values" array'));
      return;
    }

    // Validate — ensure all attributeIds exist for this entityType
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

    // Upsert each value
    const operations: AnyBulkWriteOperation[] = values.map((v) => ({
      updateOne: {
        filter: { entityType, entityId, attributeId: v.attributeId },
        update: { $set: { value: v.value } },
        upsert: true,
      },
    }));

    await EntityAttributeValueModel.bulkWrite(operations);

    // Return updated values
    const updated = await EntityAttributeValueModel.find({ entityType, entityId });
    res.json(success(updated, 'Attributes updated'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json(error(message));
  }
});
