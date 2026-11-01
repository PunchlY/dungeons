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

export function build() {
  const offeringGroup = [
    weaponData.MeleeWeapons,
    weaponData.RangedWeapons,
    armorData,
    artifactData,
  ]
    .map((data) =>
      Map.groupBy(data, ({ runes }) => runes.sort().join(""))
        .entries()
        .map(([runes, data]) =>
          [Runes.from(runes), data.map(({ name }) => name)] as const
        )
    )
    .map((value) => new Map(value).set(new Runes(), []));

  const runes = new Runes();
  const selected: Runes[] = [];
  function* dfs(depth: number): Generator<{
    meleeWeapons: string;
    rangedWeapons: string;
    armor: string;
    artifact: string;
  }> {
    if (depth === offeringGroup.length) {
      if (!runes.hasAncient()) return;
      yield {
        meleeWeapons: selected[0]!.toString(),
        rangedWeapons: selected[1]!.toString(),
        armor: selected[2]!.toString(),
        artifact: selected[3]!.toString(),
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

  return dfs(0);
}
