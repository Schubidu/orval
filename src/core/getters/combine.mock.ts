import { ReferenceObject, SchemaObject } from 'openapi3-ts';
import { ContextSpecs, MockOptions } from '../../types';
import { GeneratorImport } from '../../types/generator';
import { asyncReduce } from '../../utils/async-reduce';
import { resolveMockValue } from '../resolvers/value.mock';

export const combineSchemasMock = async ({
  item,
  items,
  isOneOf,
  mockOptions,
  operationId,
  tags,
  combine,
  context,
}: {
  item: SchemaObject & { name: string; path?: string; specKey?: string };
  items: (SchemaObject | ReferenceObject)[];
  isOneOf: boolean;
  operationId: string;
  mockOptions?: MockOptions;
  tags: string[];
  combine?: { properties: string[] };
  context: ContextSpecs;
}) => {
  let imports: GeneratorImport[] = [];
  let properties: string[] = [...(combine?.properties || [])];
  const value = await asyncReduce(
    items,
    async (acc, val, index, arr) => {
      const resolvedValue = await resolveMockValue({
        schema: {
          ...val,
          name: item.name,
          path: item.path ? item.path : '#',
          specKey: item.specKey,
        },
        combine: !isOneOf
          ? {
              properties,
            }
          : undefined,
        mockOptions,
        operationId,
        tags,
        context,
      });

      imports = [...imports, ...resolvedValue.imports];
      properties = [...properties, ...(resolvedValue.properties || [])];

      if (!index && !combine) {
        if (resolvedValue.enums || isOneOf) {
          if (arr.length === 1) {
            return `faker.helpers.randomize([${resolvedValue.value}])`;
          }
          return `faker.helpers.randomize([${resolvedValue.value},`;
        }
        if (arr.length === 1) {
          return `{${resolvedValue.value}}`;
        }
        return `{${resolvedValue.value},`;
      }
      if (arr.length - 1 === index) {
        if (resolvedValue.enums || isOneOf) {
          return acc + resolvedValue.value + (!combine ? '])' : '');
        }
        return acc + resolvedValue.value + (!combine ? '}' : '');
      }
      if (!resolvedValue.value) {
        return acc;
      }
      return acc + resolvedValue.value + ',';
    },
    '',
  );

  return {
    value,
    imports,
    name: item.name,
    properties,
  };
};
