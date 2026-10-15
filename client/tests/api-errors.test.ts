import { afterEach, describe, expect, it, vi } from "vitest";
import { NETWORK_ERROR, SERVER_ERROR, api } from "../src/api/client";

/**
 * Ce que le visiteur lit quand l'API ne répond pas. Le navigateur ne fournit
 * que « Failed to fetch » — de l'anglais technique, sur un site français — et ne
 * distingue pas un serveur éteint d'une origine refusée par CORS.
 */

afterEach(() => vi.unstubAllGlobals());

const reply = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new SyntaxError("pas de JSON")) : Promise.resolve(body)),
  });

describe("erreurs de l'API côté client", () => {
  it("traduit une panne réseau au lieu de montrer « Failed to fetch »", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(api.settings()).rejects.toThrow(NETWORK_ERROR);
  });

  it("n'expose aucun message technique en anglais", () => {
    expect(NETWORK_ERROR).not.toMatch(/fetch|network|failed/i);
    expect(SERVER_ERROR).not.toMatch(/fetch|network|failed|gateway|unavailable/i);
  });

  it("laisse passer une requête annulée telle quelle", async () => {
    // useAsync ignore l'erreur d'une requête annulée : la traduire en panne la lui ferait afficher
    const abort = new DOMException("annulée", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abort));

    await expect(api.settings()).rejects.toBe(abort);
  });

  it.each([502, 503, 504])("explique un %i de la passerelle quand l'API démarre", async (status) => {
    // Render répond à la place d'une API endormie ou tombée, avec une page HTML et non du JSON
    vi.stubGlobal("fetch", reply(status, undefined));

    await expect(api.settings()).rejects.toThrow(SERVER_ERROR);
  });

  it("garde le message de l'API quand elle en fournit un", async () => {
    vi.stubGlobal("fetch", reply(401, { error: "Connexion requise" }));

    await expect(api.me()).rejects.toThrow("Connexion requise");
  });

  it("ne masque pas le message de l'API derrière celui de la passerelle", async () => {
    vi.stubGlobal("fetch", reply(503, { error: "Base de données injoignable" }));

    await expect(api.settings()).rejects.toThrow("Base de données injoignable");
  });

  it("retombe sur le code HTTP quand rien d'autre n'est disponible", async () => {
    vi.stubGlobal("fetch", reply(418, undefined));

    await expect(api.settings()).rejects.toThrow("Erreur 418");
  });
});
