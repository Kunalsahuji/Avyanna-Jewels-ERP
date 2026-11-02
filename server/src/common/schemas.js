import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParam = z.object({ id: objectId });

export const optionalObjectId = z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  objectId.optional()
);

export const optionalDate = z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  z.coerce.date().optional()
);

