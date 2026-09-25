import { describe, expect, it } from "vitest";
import {
  AMBIANCES,
  CATEGORIES,
  MORCEAUX,
  clampIndex,
  cycle,
  indexOfId,
  itemsOf,
  type Category,
} from "../src/lib/playlist";

describe("catégories du widget sonore", () => {
  it("expose exactement les deux catégories attendues, dans l'ordre d'affichage", () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual(["ambiances", "morceaux"]);
    expect(CATEGORIES.map((c) => c.label)).toEqual(["Ambiances", "Morceaux"]);
  });

  it("renvoie le bon contenu pour chaque catégorie", () => {
    expect(itemsOf("ambiances")).toBe(AMBIANCES);
    expect(itemsOf("morceaux")).toBe(MORCEAUX);
  });

  it("ne laisse aucune catégorie vide : le widget afficherait un élément indéfini", () => {
    for (const { id } of CATEGORIES) {
      expect(itemsOf(id).length).toBeGreaterThan(0);
    }
  });
});

describe("intégrité des listes", () => {
  const all = [...AMBIANCES, ...MORCEAUX];

  it("n'a aucun identifiant en double, y compris entre les deux catégories", () => {
    expect(new Set(all.map((i) => i.id)).size).toBe(all.length);
  });

  it("donne à chaque élément un titre et un sous-titre non vides", () => {
    for (const item of all) {
      expect(item.title.trim()).not.toBe("");
      expect(item.subtitle.trim()).not.toBe("");
    }
  });

  it("propose au moins deux formats par morceau, dont un MP3", () => {
    // Sans repli, un navigateur qui refuse le MP3 n'a plus rien à lire
    for (const track of MORCEAUX) {
      expect(track.sources.length).toBeGreaterThanOrEqual(2);
      expect(track.sources.some((s) => s.type === "audio/mpeg")).toBe(true);
      for (const source of track.sources) {
        // Chemin absolu depuis client/public, jamais une URL externe (la CSP la bloquerait)
        expect(source.src.startsWith("/audio/")).toBe(true);
      }
    }
  });

  it("décrit des ambiances jouables : accords non vides et réglages dans des bornes tenables", () => {
    for (const a of AMBIANCES) {
      expect(a.chords.length).toBeGreaterThan(0);
      for (const chord of a.chords) {
        expect(chord.length).toBeGreaterThan(0);
        // Hors de la bande audible, l'accord ne produirait rien d'entendable
        for (const freq of chord) expect(freq).toBeGreaterThan(20);
        for (const freq of chord) expect(freq).toBeLessThan(20000);
      }
      expect(a.intervalMs).toBeGreaterThan(0);
      expect(a.filterHz).toBeGreaterThan(0);
      expect(a.delaySeconds).toBeGreaterThan(0);
      // Un delay au-delà de 2 s dépasserait la capacité déclarée de createDelay(2)
      expect(a.delaySeconds).toBeLessThanOrEqual(2);
      // Une réinjection ≥ 1 ferait monter l'écho à l'infini
      expect(a.feedback).toBeGreaterThan(0);
      expect(a.feedback).toBeLessThan(1);
    }
  });
});

describe("cycle — passage à l'élément suivant ou précédent", () => {
  it("avance et recule d'une position", () => {
    expect(cycle(0, 3, 1)).toBe(1);
    expect(cycle(2, 3, -1)).toBe(1);
  });

  it("reboucle aux deux extrémités", () => {
    expect(cycle(2, 3, 1)).toBe(0);
    expect(cycle(0, 3, -1)).toBe(2);
  });

  it("reste sur place quand la liste ne contient qu'un élément", () => {
    expect(cycle(0, 1, 1)).toBe(0);
    expect(cycle(0, 1, -1)).toBe(0);
  });

  it("renvoie 0 sur une liste vide plutôt que NaN", () => {
    expect(cycle(0, 0, 1)).toBe(0);
    expect(cycle(3, 0, -1)).toBe(0);
  });

  it("revient au point de départ après un tour complet", () => {
    const length = AMBIANCES.length;
    let index = 0;
    for (let i = 0; i < length; i++) index = cycle(index, length, 1);
    expect(index).toBe(0);
  });
});

describe("indexOfId — retrouver un élément par son identifiant", () => {
  it("renvoie la position de l'élément", () => {
    expect(indexOfId(AMBIANCES, AMBIANCES[1].id)).toBe(1);
  });

  it("retombe sur le premier élément quand l'identifiant a disparu de la liste", () => {
    expect(indexOfId(AMBIANCES, "ambiance-supprimee")).toBe(0);
    expect(indexOfId(AMBIANCES, null)).toBe(0);
  });
});

describe("clampIndex — index toujours dans les bornes", () => {
  it("laisse passer un index valide", () => {
    expect(clampIndex(1, 3)).toBe(1);
  });

  it("ramène un index hors bornes sur le dernier ou le premier élément", () => {
    expect(clampIndex(9, 3)).toBe(2);
    expect(clampIndex(-4, 3)).toBe(0);
  });

  it("renvoie 0 sur une liste vide", () => {
    expect(clampIndex(2, 0)).toBe(0);
  });

  it("protège le changement de catégorie : la position gardée peut dépasser la nouvelle liste", () => {
    // On était sur la 3e ambiance, on passe aux morceaux qui sont moins nombreux
    const kept = AMBIANCES.length - 1;
    const category: Category = "morceaux";
    const index = clampIndex(kept, itemsOf(category).length);
    expect(itemsOf(category)[index]).toBeDefined();
  });
});
