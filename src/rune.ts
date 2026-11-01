import armorData from "../assets/armor.json";
import artifactData from "../assets/artifact.json";
import weaponData from "../assets/weapon.json";
import ancientData from "../assets/ancient.json";

export class Runes extends Map<string, number> {
  static from(data: string[] | string) {
    const runes = new Runes();
    for (const rune of Array.isArray(data) ? data.join("") : data) {
      runes.set(rune, runes.get(rune) + 1);
    }
    return runes;
  }

  static ancient = new Map(
    ancientData.map(({ name, runes }) => [name, Runes.from(runes)]),
  );
  static ancients(ancients: string[]) {
    const runes = new Runes();

    for (const name of ancients) {
      if (!Runes.ancient.has(name)) continue;
      for (const [rune, count] of Runes.ancient.get(name)!) {
        runes.set(rune, Math.max(runes.get(rune), count));
      }
    }
    return runes;
  }

  override get(key: string) {
    return super.get(key) ?? 0;
  }

  override set(key: string, value: number) {
    if (value <= 0) {
      super.delete(key);
      return this;
    }
    return super.set(key, value);
  }

  add(runes: Runes) {
    for (const [rune, count] of runes) {
      this.set(rune, this.get(rune) + count);
    }
    return this;
  }

  subtract(runes: Runes) {
    for (const [rune, count] of runes) {
      this.set(rune, this.get(rune) - count);
    }
    return this;
  }

  isSupersetOf(required: Runes) {
    return required.entries()
      .every(([rune, count]) => this.get(rune) >= count);
  }

  hasAncient() {
    return Runes.ancient
      .entries()
      .some(([, required]) => this.isSupersetOf(required));
  }

  getAncients() {
    return Runes.ancient
      .entries()
      .filter(([, required]) => this.isSupersetOf(required))
      .map(([name]) => name)
      .toArray();
  }

  override toString() {
    return super.entries()
      .flatMap(([rune, count]) => Array.from({ length: count }, () => rune))
      .toArray()
      .sort()
      .join("");
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toString();
  }
}

export const build = (() => {
  type Build = {
    meleeWeapons: string[];
    rangedWeapons: string[];
    armor: string[];
    artifact: string[];
    ancients: string[];
    usage: number;
  };

  let prev: {
    requiredAncients: string[];
    useRunes: Set<string>[];
    res: Build[];
  } | undefined;

  return function (offerings: string[], requiredAncients: string[]) {
    const required = Runes.ancients(requiredAncients);
    const offeringGroup = [
      weaponData.MeleeWeapons,
      weaponData.RangedWeapons,
      armorData,
      artifactData,
    ]
      .map((data) => data.filter(({ name }) => offerings.includes(name)))
      .map((data) =>
        Map.groupBy(data, ({ runes }) => runes.sort().join(""))
          .entries()
          .map(([runes, data]) =>
            [Runes.from(runes), data.map(({ name }) => name)] as const
          )
      )
      .map((value) => new Map(value).set(new Runes(), []));

    const useRunes = offeringGroup.map((v) =>
      new Set(v.keys().map((v) => v.toString()))
    );

    if (prev) {
      if (
        new Set(prev.requiredAncients).symmetricDifference(new Set(requiredAncients))
            .size === 0 &&
        useRunes.every((set, i) =>
          prev!.useRunes[i]!.symmetricDifference(set).size === 0
        )
      ) {
        return prev.res;
      }
    }

    const runes = new Runes();
    const selected: Runes[] = [];
    function* dfs(depth: number): Generator<Build> {
      if (depth === offeringGroup.length) {
        if (!runes.isSupersetOf(required)) return;
        const ancients = runes.getAncients();
        if (!ancients.length) return;
        yield {
          meleeWeapons: offeringGroup[0]!.get(selected[0]!)!,
          rangedWeapons: offeringGroup[1]!.get(selected[1]!)!,
          armor: offeringGroup[2]!.get(selected[2]!)!,
          artifact: offeringGroup[3]!.get(selected[3]!)!,
          ancients,
          usage: Runes.ancients(ancients).values().reduce((p, c) => p + c) /
            runes.values().reduce((p, c) => p + c),
        };
        return;
      }

      for (const [offering] of offeringGroup[depth]!) {
        runes.add(offering);
        selected.push(offering);

        yield* dfs(depth + 1);

        selected.pop();
        runes.subtract(offering);
      }
    }

    const res = dfs(0).toArray();

    prev = {
      requiredAncients: requiredAncients,
      useRunes,
      res,
    };

    return res;
  };
})();
