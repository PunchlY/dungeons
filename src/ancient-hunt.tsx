import armorData from "../assets/armor.json";
import artifactData from "../assets/artifact.json";
import weaponData from "../assets/weapon.json";
import ancientData from "../assets/ancient.json";
import rarityData from "../assets/rarity.json";
import runeIcons from "../assets/rune-icons.json";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { build, Runes } from "./rune";

function Item({ name, rune }: {
  name?: string;
  rune?: boolean;
}) {
  const offerings = useMemo(
    () =>
      new Map([
        ...weaponData.MeleeWeapons,
        ...weaponData.RangedWeapons,
        ...armorData,
        ...artifactData,
      ]
        .map((data) => [data.name, data])),
    [],
  );

  if (!name || !offerings.has(name)) {
    return <div className="@container relative aspect-square"></div>;
  }
  const { tags, icon, runes } = offerings.get(name)!;
  return (
    <div className="@container relative aspect-square">
      <img
        src={tags.includes("Unique")
          ? rarityData.UniqueMainSlot
          : rarityData.RareMainSlot}
        className="absolute inset-0 m-auto size-full [image-rendering:pixelated]"
      />
      <img
        title={name}
        src={icon}
        className="absolute inset-0 m-auto size-[80%] [image-rendering:pixelated]"
      />
      {rune &&
        (
          <div className="absolute bottom-0 left-0 flex gap-[1cqw]">
            {runes.sort().map((rune) => (
              <img
                key={rune}
                title={rune}
                src={runeIcons[rune as keyof typeof runeIcons]}
                className="aspect-square w-[20cqw] [image-rendering:pixelated]"
              />
            ))}
          </div>
        )}
    </div>
  );
}

function Ancient({ name, rune }: {
  name: string;
  rune?: boolean;
}) {
  const ancient = useMemo(
    () => new Map(ancientData.map((data) => [data.name, data])),
    [],
  );

  if (!ancient.has(name)) {
    throw new Error();
  }
  const { icon, runes } = ancient.get(name)!;
  return (
    <div className="@container relative aspect-square">
      <img
        title={name}
        src={icon}
        className="absolute inset-0 m-auto size-full [image-rendering:pixelated]"
      />
      {rune &&
        (
          <div className="absolute bottom-0 left-0 flex gap-[1cqw]">
            {runes.sort().map((rune) => (
              <img
                title={rune}
                src={runeIcons[rune as keyof typeof runeIcons]}
                className="aspect-square w-[20cqw] [image-rendering:pixelated]"
              />
            ))}
          </div>
        )}
    </div>
  );
}

export function Ancients() {
  const [selected, setSelected] = useState(() => ancientData[0]!);

  return (
    <div className="h-screen grid min-h-0 grid-rows-1 grid-cols-4 gap-1 lg:grid-cols-6">
      <div className="col-span-3 min-h-0 min-w-0 overflow-y-auto grid grid-cols-3 content-start gap-1 lg:col-span-5 lg:grid-cols-5">
        {selected.drops.map((name) => <Item key={name} name={name} rune />)}
      </div>

      <div className="col-span-1 min-h-0 min-w-0 overflow-y-auto">
        {ancientData.map((data) => (
          <div
            key={data.name}
            className="saturate-[var(--saturation)]"
            style={{
              "--saturation": selected.name === data.name ? 1 : 0,
            } as React.CSSProperties}
            onClick={() => setSelected(data)}
          >
            <Ancient name={data.name} rune />
          </div>
        ))}
      </div>
    </div>
  );
}

export function All() {
  const offerings = useMemo(() => [
    ...weaponData.MeleeWeapons,
    ...weaponData.RangedWeapons,
    ...armorData,
    ...artifactData,
  ], []);
  return (
    <div className="grid grid-rows-1 grid-cols-4 gap-1 lg:grid-cols-6">
      {ancientData.map(({ name }) => <Ancient key={name} name={name} rune />)}
      {offerings.map(({ name }) => <Item key={name} name={name} rune />)}
    </div>
  );
}

function useLocalStorage<T>(key: string, initialValue: () => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? initialValue() : JSON.parse(stored);
    } catch {
      return initialValue();
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

export function Build() {
  const data = useMemo(() => build().toArray(), []);

  const [items, setItems] = useLocalStorage(
    "MCD:Build:items",
    () => {
      return [
        ...weaponData.MeleeWeapons,
        ...weaponData.RangedWeapons,
        ...armorData,
        ...artifactData,
      ]
        .filter(({ tags }) => !tags.includes("Tower"))
        .map(({ name }) => name);
    },
  );

  const [requiredAncients, setRequiredAncients] = useLocalStorage<string[]>(
    "MCD:Build:requiredAncients",
    () => [],
  );

  const offerings = useMemo(
    () =>
      [
        weaponData.MeleeWeapons,
        weaponData.RangedWeapons,
        armorData,
        artifactData,
      ]
        .map((offerings) =>
          offerings.filter(({ name }) => items.includes(name))
        )
        .map((offerings) =>
          Map.groupBy(offerings, ({ runes }) => Runes.from(runes).toString())
            .entries()
            .map(([runes, data]) =>
              [runes, data.map(({ name }) => name)] as const
            )
        )
        .map((value) => new Map(value).set("", [])),
    [items],
  );

  const filterRequired = useMemo(
    () => {
      const required = Runes.ancients(requiredAncients);
      return data
        .values()
        .map((row) => ({
          meleeWeapons: row[0],
          rangedWeapons: row[1],
          armor: row[2],
          artifact: row[3],
          runes: Runes.from(row),
        }))
        .filter(({ runes }) => runes.isSupersetOf(required))
        .map(({ runes, ...row }) => ({
          ...row,
          ancients: runes.getAncients(),
        }))
        .toArray();
    },
    [data, requiredAncients],
  );

  const filterItem = useMemo(
    () =>
      filterRequired
        .values()
        .filter((row) =>
          offerings[0]!.has(row.meleeWeapons) &&
          offerings[1]!.has(row.rangedWeapons) &&
          offerings[2]!.has(row.armor) &&
          offerings[3]!.has(row.artifact)
        )
        .map((row) => ({
          meleeWeapons: offerings[0]!
            .get(row.meleeWeapons)!,
          rangedWeapons: offerings[1]!
            .get(row.rangedWeapons)!,
          armor: offerings[2]!
            .get(row.armor)!,
          artifact: offerings[3]!
            .get(row.artifact)!,
          ancients: row.ancients,
        }))
        .toArray(),
    [filterRequired, offerings],
  );

  const sortDate = useMemo(
    () =>
      filterItem
        .sort((a, b) => b.ancients.length - a.ancients.length),
    [filterItem],
  );

  const toggleItem = useCallback((name: string) => {
    const set = new Set(items);
    if (set.has(name)) {
      set.delete(name);
    } else {
      set.add(name);
    }
    setItems([...set]);
  }, [items]);

  const toggleAncient = useCallback((name: string) => {
    const set = new Set(requiredAncients);
    if (set.has(name)) {
      set.delete(name);
    } else {
      set.add(name);
    }
    setRequiredAncients([...set]);
  }, [requiredAncients]);

  return (
    <div className="h-screen flex flex-col md:flex-row">
      <div className="flex-1 overflow-y-auto">
        <TabGroup className="relative">
          <TabList className="sticky top-0 z-1 flex flex-row bg-white">
            <Tab className="flex-1">Ancients</Tab>
            <Tab className="flex-1">Melee Weapons</Tab>
            <Tab className="flex-1">Ranged Weapons</Tab>
            <Tab className="flex-1">Armors</Tab>
            <Tab className="flex-1">Artifacts</Tab>
            <Tab className="flex-1">Options</Tab>
          </TabList>
          <TabPanels>
            <TabPanel className="grid grid-cols-5">
              {ancientData.map((data) => (
                <div
                  key={data.name}
                  className="saturate-[var(--saturation)]"
                  style={{
                    "--saturation": requiredAncients.includes(data.name)
                      ? 1
                      : 0.1,
                  } as React.CSSProperties}
                  onClick={() => toggleAncient(data.name)}
                >
                  <Ancient key={data.name} name={data.name} rune />
                </div>
              ))}
            </TabPanel>
            {[
              weaponData.MeleeWeapons,
              weaponData.RangedWeapons,
              armorData,
              artifactData,
            ].map((offerings) => (
              <TabPanel className="grid grid-cols-5">
                {offerings.map((data) => (
                  <div
                    key={data.name}
                    className="saturate-[var(--saturation)]"
                    style={{
                      "--saturation": items.includes(data.name) ? 1 : 0.1,
                    } as React.CSSProperties}
                    onClick={() => toggleItem(data.name)}
                  >
                    <Item key={data.name} name={data.name} rune />
                  </div>
                ))}
              </TabPanel>
            ))}
            <TabPanel>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
      <div className="@container flex-1">
        <Virtuoso
          data={sortDate}
          itemContent={(index, data) => {
            return (
              <div className="h-[20cqw] grid grid-cols-5">
                <Item name={data.meleeWeapons[0]} rune />
                <Item name={data.rangedWeapons[0]} rune />
                <Item name={data.armor[0]} rune />
                <Item name={data.artifact[0]} rune />
                <div className="grid grid-cols-4 grid-rows-4">
                  {data.ancients.sort().map((name) => (
                    <Ancient key={name} name={name} />
                  ))}
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
