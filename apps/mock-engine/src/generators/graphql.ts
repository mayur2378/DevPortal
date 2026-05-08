import {
  buildSchema,
  graphql,
  GraphQLObjectType,
  GraphQLScalarType,
  isObjectType,
  isScalarType,
  isListType,
  isNonNullType,
  GraphQLSchema,
  GraphQLType,
} from "graphql";

function mockValue(type: GraphQLType): unknown {
  if (isNonNullType(type)) return mockValue(type.ofType);
  if (isListType(type)) return [mockValue(type.ofType)];
  if (isScalarType(type)) {
    const name = (type as GraphQLScalarType).name;
    if (name === "ID") return "mock-id-1";
    if (name === "String") return "mock-string";
    if (name === "Int") return 42;
    if (name === "Float") return 3.14;
    if (name === "Boolean") return true;
    return null;
  }
  if (isObjectType(type)) {
    const obj: Record<string, unknown> = {};
    const fields = (type as GraphQLObjectType).getFields();
    for (const [key, field] of Object.entries(fields)) {
      obj[key] = mockValue(field.type);
    }
    return obj;
  }
  return null;
}

function buildMockResolvers(schema: GraphQLSchema): Record<string, () => unknown> {
  const queryType = schema.getQueryType();
  if (!queryType) return {};
  const resolvers: Record<string, () => unknown> = {};
  for (const [fieldName, field] of Object.entries(queryType.getFields())) {
    resolvers[fieldName] = () => mockValue(field.type);
  }
  return resolvers;
}

export async function generateGraphQLResponse(
  sdl: string,
  query: string
): Promise<{ data?: any; errors?: readonly any[] }> {
  const schema = buildSchema(sdl);
  const rootValue = buildMockResolvers(schema);
  const result = await graphql({ schema, source: query, rootValue });
  return result as any;
}
