import { describe, it, expect } from "vitest";
import { generateOpenApiResponse } from "../../src/generators/openapi";

const petStoreSpec = {
  openapi: "3.0.0",
  info: { title: "Pets", version: "1.0.0" },
  paths: {
    "/pets": {
      get: {
        operationId: "listPets",
        responses: {
          "200": {
            description: "A list of pets",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      name: { type: "string" },
                    },
                    required: ["id", "name"],
                  },
                },
                example: [{ id: 1, name: "Fluffy" }],
              },
            },
          },
        },
      },
    },
    "/pets/{id}": {
      get: {
        operationId: "getPet",
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

describe("generateOpenApiResponse", () => {
  it("returns the spec example when present", async () => {
    const result = await generateOpenApiResponse(petStoreSpec as any, "listPets", "200");
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual([{ id: 1, name: "Fluffy" }]);
  });

  it("generates data from schema when no example is present", async () => {
    const result = await generateOpenApiResponse(petStoreSpec as any, "getPet", "200");
    expect(result.statusCode).toBe(200);
    expect(result.body).toHaveProperty("id");
    expect(result.body).toHaveProperty("name");
  });

  it("throws when operationId is not found", async () => {
    await expect(
      generateOpenApiResponse(petStoreSpec as any, "nonExistent", "200")
    ).rejects.toThrow("Operation not found");
  });
});
