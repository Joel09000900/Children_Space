import { describe, expect, it } from "vitest";
import {
  MIN_PROD_ADMIN_PASSWORD,
  adminConfig,
  normalizeIdentifier,
  sessionCookieOptions,
  userIdentifierWhere,
} from "../src/lib/auth";

const base = {
  ADMIN_EMAIL: "olykris@olikrys.local",
  ADMIN_USERNAME: "olykris",
  ADMIN_PASSWORD: "0000",
  ADMIN_NAME: "Olykris",
} as NodeJS.ProcessEnv;

describe("configuration du compte admin", () => {
  it("accepte « 0000 » en développement", () => {
    expect(adminConfig({ ...base, NODE_ENV: "development" })).toEqual({
      email: "olykris@olikrys.local",
      username: "olykris",
      password: "0000",
      name: "Olykris",
    });
  });

  it("refuse « 0000 » en production", () => {
    expect(() => adminConfig({ ...base, NODE_ENV: "production" })).toThrow(/ADMIN_PASSWORD trop faible/);
  });

  it("accepte un mot de passe assez long en production", () => {
    const password = "x".repeat(MIN_PROD_ADMIN_PASSWORD);
    expect(adminConfig({ ...base, ADMIN_PASSWORD: password, NODE_ENV: "production" })?.password).toBe(password);
  });

  it("met le pseudo en minuscules", () => {
    expect(adminConfig({ ...base, ADMIN_USERNAME: "Olykris" })?.username).toBe("olykris");
  });

  it("refuse un pseudo contenant une arobase ou trop court", () => {
    expect(() => adminConfig({ ...base, ADMIN_USERNAME: "oli@krys" })).toThrow(/ADMIN_USERNAME invalide/);
    expect(() => adminConfig({ ...base, ADMIN_USERNAME: "ol" })).toThrow(/ADMIN_USERNAME invalide/);
  });

  it("renvoie null quand aucun compte n'est configuré", () => {
    expect(adminConfig({})).toBeNull();
    expect(adminConfig({ ADMIN_EMAIL: "a@b.c" })).toBeNull();
  });
});

describe("identifiant de connexion", () => {
  it("est insensible à la casse et aux espaces", () => {
    expect(normalizeIdentifier("  Olykris  ")).toBe("olykris");
    expect(normalizeIdentifier("OLYKRIS@OLIKRYS.LOCAL")).toBe("olykris@olikrys.local");
  });

  it("cherche à la fois sur l'e-mail et sur le pseudo", () => {
    expect(userIdentifierWhere(" Olykris ")).toEqual({ OR: [{ email: "olykris" }, { username: "olykris" }] });
  });
});

describe("cookie de session", () => {
  it("reste en Lax et sans Secure en développement", () => {
    expect(sessionCookieOptions({ NODE_ENV: "development" })).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });
  });

  it("passe en Secure en production", () => {
    expect(sessionCookieOptions({ NODE_ENV: "production" })).toMatchObject({ sameSite: "lax", secure: true });
  });

  it("passe en SameSite=None + Secure quand le front est sur un autre domaine", () => {
    expect(sessionCookieOptions({ CROSS_SITE_COOKIE: "true" })).toMatchObject({
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
  });
});
