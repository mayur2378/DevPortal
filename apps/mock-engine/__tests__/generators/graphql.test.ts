import { describe, it, expect } from "vitest";
import { generateGraphQLResponse } from "../../src/generators/graphql";

const sdl = `
  type Query {
    user(id: ID!): User
    users: [User!]!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    age: Int
    active: Boolean!
  }
`;

describe("generateGraphQLResponse", () => {
  it("generates a mock response for a simple query", async () => {
    const result = await generateGraphQLResponse(sdl, '{ user(id: "1") { id name email } }');
    expect(result.data).toHaveProperty("user");
    expect(result.data.user).toHaveProperty("id");
    expect(result.data.user).toHaveProperty("name");
  });

  it("generates array responses for list queries", async () => {
    const result = await generateGraphQLResponse(sdl, "{ users { id name } }");
    expect(Array.isArray(result.data.users)).toBe(true);
  });

  it("returns graphql errors for invalid queries", async () => {
    const result = await generateGraphQLResponse(sdl, "{ nonExistentField }");
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });
});
