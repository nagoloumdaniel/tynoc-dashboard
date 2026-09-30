import { describe, expect, it } from "vitest";
import { forReader } from "./privacy";

const entry = {
  id: "1",
  actorEmail: "daniel@gmail.com",
  summary: "Modification du compte de Jeanne",
  changes: {
    email: { from: "jeanne@exemple.fr", to: "j.martin@exemple.fr" },
    stock: { from: 2, to: 5 },
  },
};

describe("forReader", () => {
  it("hides every address from read-only admins", () => {
    const [masked] = forReader([entry], "VIEWER");
    expect(masked).toMatchObject({
      id: "1",
      actorEmail: "d•••@gmail.com",
      changes: {
        email: { from: "j•••@exemple.fr", to: "j•••@exemple.fr" },
        stock: { from: 2, to: 5 },
      },
    });
  });

  it("shows everything to other admins", () => {
    expect(forReader([entry], "ADMIN")).toEqual([entry]);
    expect(forReader([entry], "SUPER_ADMIN")).toEqual([entry]);
  });
});
