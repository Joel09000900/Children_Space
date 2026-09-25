import { describe, expect, it } from "vitest";
import { allowedOrigins, cspDirectives, normalizeOrigin, trustProxySetting } from "../src/app";
import { adminConfig, sessionCookieOptions } from "../src/lib/auth";
import { isOriginAllowed } from "../src/middleware/origin";

/**
 * Configuration réelle du déploiement : site sur Vercel, API sur Render, base sur Neon.
 * Ces tests figent les combinaisons qui, mal réglées, cassent la mise en ligne
 * sans message d'erreur exploitable.
 */

const VERCEL = "https://olikrys.vercel.app";

/** Variables telles qu'elles sont posées sur Render (voir render.yaml) */
const RENDER_ENV = {
  NODE_ENV: "production",
  CLIENT_ORIGIN: VERCEL,
  CROSS_SITE_COOKIE: "true",
  TRUST_PROXY: "1",
  ADMIN_EMAIL: "olykris@olikrys.local",
  ADMIN_USERNAME: "olykris",
  ADMIN_PASSWORD: "un-mot-de-passe-assez-long",
  ADMIN_NAME: "Olykris",
};

describe("déploiement Render + Vercel", () => {
  it("n'autorise que le domaine du site", () => {
    expect(allowedOrigins(RENDER_ENV)).toEqual([VERCEL]);
  });

  it("émet un cookie de session utilisable entre deux domaines", () => {
    // Sans SameSite=None + Secure, le navigateur refuse le cookie et la connexion
    // ne survit pas au rechargement de la page.
    expect(sessionCookieOptions(RENDER_ENV)).toMatchObject({
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
    });
  });

  it("fait confiance au reverse proxy de Render, à un seul saut", () => {
    expect(trustProxySetting(RENDER_ENV)).toBe(1);
  });

  it("accepte la configuration du compte administrateur", () => {
    expect(adminConfig(RENDER_ENV)).toMatchObject({ email: "olykris@olikrys.local", username: "olykris" });
  });

  it("laisse passer le site et rejette tout le reste", () => {
    const origins = allowedOrigins(RENDER_ENV);
    expect(isOriginAllowed(VERCEL, origins)).toBe(true);
    expect(isOriginAllowed("https://olikrys.vercel.app.evil.com", origins)).toBe(false);
    expect(isOriginAllowed("http://olikrys.vercel.app", origins)).toBe(false); // http, pas https
    expect(isOriginAllowed("https://autre.vercel.app", origins)).toBe(false);
  });
});

describe("pièges de configuration au moment de la mise en ligne", () => {
  it("tolère une barre finale copiée depuis la barre d'adresse", () => {
    // C'est l'erreur la plus courante : elle cassait CORS *et* le contrôle d'Origin
    const origins = allowedOrigins({ ...RENDER_ENV, CLIENT_ORIGIN: `${VERCEL}/` });
    expect(origins).toEqual([VERCEL]);
    expect(isOriginAllowed(VERCEL, origins)).toBe(true);
  });

  it("tolère un chemin collé par erreur et les espaces", () => {
    expect(allowedOrigins({ ...RENDER_ENV, CLIENT_ORIGIN: `  ${VERCEL}/contact  ` })).toEqual([VERCEL]);
  });

  it("accepte le domaine Vercel et un domaine personnalisé", () => {
    const env = { ...RENDER_ENV, CLIENT_ORIGIN: `${VERCEL}/, https://olikrys.art` };
    expect(allowedOrigins(env)).toEqual([VERCEL, "https://olikrys.art"]);
  });

  it("ne garde pas deux fois la même origine", () => {
    expect(allowedOrigins({ ...RENDER_ENV, CLIENT_ORIGIN: `${VERCEL},${VERCEL}/` })).toEqual([VERCEL]);
  });

  it("refuse de démarrer si CLIENT_ORIGIN est oublié", () => {
    expect(() => allowedOrigins({ NODE_ENV: "production" })).toThrow(/CLIENT_ORIGIN/);
    expect(() => allowedOrigins({ NODE_ENV: "production", CLIENT_ORIGIN: " , " })).toThrow(/CLIENT_ORIGIN/);
  });

  it("refuse de démarrer avec un mot de passe admin trop court", () => {
    expect(() => adminConfig({ ...RENDER_ENV, ADMIN_PASSWORD: "0000" })).toThrow(/ADMIN_PASSWORD/);
  });

  it("garde le cookie en Lax tant que CROSS_SITE_COOKIE n'est pas activé", () => {
    // Piège inverse : site et API sur le même domaine, SameSite=None serait inutilement permissif
    expect(sessionCookieOptions({ ...RENDER_ENV, CROSS_SITE_COOKIE: "false" })).toMatchObject({
      sameSite: "lax",
      secure: true,
    });
  });
});

describe("normalizeOrigin", () => {
  it("ramène toute écriture à la forme envoyée par le navigateur", () => {
    for (const written of [VERCEL, `${VERCEL}/`, `${VERCEL}///`, `${VERCEL}/a-propos`, ` ${VERCEL} `]) {
      expect(normalizeOrigin(written)).toBe(VERCEL);
    }
  });

  it("conserve un port explicite", () => {
    expect(normalizeOrigin("http://localhost:5173/")).toBe("http://localhost:5173");
  });

  it("renvoie une chaîne vide sur une valeur vide", () => {
    expect(normalizeOrigin("   ")).toBe("");
  });
});

describe("en-têtes de sécurité servis par l'API", () => {
  it("ne laisse aucune directive ouverte en production", () => {
    for (const [directive, sources] of Object.entries(cspDirectives())) {
      expect(sources, directive).not.toContain("*");
      expect(sources, directive).not.toContain("http:");
    }
  });
});
