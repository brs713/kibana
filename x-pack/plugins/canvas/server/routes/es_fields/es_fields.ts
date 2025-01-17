/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, keys } from 'lodash';
import { schema } from '@kbn/config-schema';
import { API_ROUTE } from '../../../common/lib';
import { catchErrorHandler } from '../catch_error_handler';
import { normalizeType } from '../../../common/lib/request/normalize_type';
import { RouteInitializerDeps } from '..';

const ESFieldsRequestSchema = schema.object({
  index: schema.string(),
  fields: schema.maybe(schema.arrayOf(schema.string())),
});

export function initializeESFieldsRoute(deps: RouteInitializerDeps) {
  const { router } = deps;

  router.get(
    {
      path: `${API_ROUTE}/es_fields`,
      validate: {
        query: ESFieldsRequestSchema,
      },
    },
    catchErrorHandler(async (context, request, response) => {
      const client = context.core.elasticsearch.client.asCurrentUser;
      const { index, fields } = request.query;

      const config = {
        index,
        fields: fields || '*',
      };

      const esFields = await client.fieldCaps(config).then((resp) => {
        return mapValues(resp.fields, (types) => {
          if (keys(types).length > 1) {
            return 'conflict';
          }

          try {
            return normalizeType(keys(types)[0]);
          } catch (e) {
            return 'unsupported';
          }
        });
      });

      return response.ok({
        body: esFields,
      });
    })
  );
}
