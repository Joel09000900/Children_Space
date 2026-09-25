import { describe, expect, it } from "vitest";
import { PRIVATE_SETTING_PREFIX, settingsToObject } from "../src/lib/serializers";

describe("réglages publics", () => {
  const rows = [
    { key: "artist_name", value: "OliKrys" },
    { key: "whatsapp_number", value: "2250000000000" },
    { key: `${PRIVATE_SETTING_PREFIX}mailer_token`, value: "sk-secret-a-ne-jamais-servir" },
  ];

  it("convertit les lignes en objet clé/valeur", () => {
    expect(settingsToObject(rows).artist_name).toBe("OliKrys");
    expect(settingsToObject(rows).whatsapp_number).toBe("2250000000000");
  });

  it("retire les clés marquées privées", () => {
    const out = settingsToObject(rows);
    expect(out).not.toHaveProperty(`${PRIVATE_SETTING_PREFIX}mailer_token`);
    expect(JSON.stringify(out)).not.toContain("sk-secret");
  });

  it("gère une table vide", () => {
    expect(settingsToObject([])).toEqual({});
  });

  it("ne laisse passer aucune clé privée, quel que soit son nom", () => {
    const secrets = ["private_a", "private_", "private_token_smtp"];
    const out = settingsToObject(secrets.map((key) => ({ key, value: "x" })));
    expect(Object.keys(out)).toEqual([]);
  });

  it("ne confond pas une clé qui contient le préfixe sans commencer par lui", () => {
    const out = settingsToObject([{ key: "note_private_publique", value: "visible" }]);
    expect(out.note_private_publique).toBe("visible");
  });
});
