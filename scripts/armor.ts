await using view = new Bun.WebView();

await view.navigate("about:blank");
await view.cdp("Emulation.setScriptExecutionDisabled", { value: true });

await view.navigate("https://minecraft.wiki/w/Dungeons:Armor");

const value = await view.evaluate(`(${
  (() => {
    function* generator(table: HTMLTableElement, tags: string[]) {
      let seasonalEvent: string | undefined = undefined;
      const keys = Iterator.from(
        table.tBodies
          .item(0)!.rows
          .item(0)!.cells,
      )
        .map((e) => e.innerText)
        .toArray();
      for (const row of Iterator.from(table.tBodies.item(0)!.rows).drop(1)) {
        if (row.cells.length === 1) {
          seasonalEvent = row.cells
            .item(0)!
            .querySelector<HTMLElement>("a[title]")!
            .title
            .replace("Dungeons:", "");
          continue;
        }
        yield Object.fromEntries(function* () {
          const exportTags = new Set(tags);
          if (seasonalEvent) {
            exportTags.delete("Daily Trial");
            exportTags.add("Seasonal Event");
          }
          for (const [index, key] of keys.entries()) {
            const e = row.cells.item(index)!;
            if (key.includes("Icon")) {
              yield [
                "icon",
                e.querySelector("a")!.href,
              ];
            } else if (key.includes("Name")) {
              yield [
                "name",
                e.querySelector<HTMLElement>("[title]")!
                  .title
                  .replace("Dungeons:", ""),
              ];
              yield [
                "wiki",
                e.querySelector("a")!.href,
              ];
            } else if (key.includes("Runes")) {
              yield [
                "runes",
                e.querySelectorAll<HTMLElement>("[title]")
                  .values()
                  .map((e) => e.title.replace("Rune ", ""))
                  .toArray(),
              ];
            } else if (key.includes("Group")) {
              exportTags.add(e.innerText);
            } else if (key.includes("DLC")) {
              const dlc = e.querySelector<HTMLElement>("[title]")
                ?.title
                .replace("Dungeons:", "");
              if (dlc) {
                exportTags.add(dlc);
                exportTags.add("Downloadable content");
              }
            } else if (key.includes("Unique")) {
              if (e.innerText.includes("Yes")) {
                exportTags.add("Unique");
              }
            }
          }
          yield ["tags", Array.from(exportTags)];
        }());
      }
    }
    const tables = document.querySelectorAll("table");

    return [
      ...generator(tables.item(0), ["Default", "Adventure", "Apocalypse"]),
      ...generator(tables.item(1), ["Adventure", "Apocalypse"]),
      ...generator(tables.item(2), ["Apocalypse"]),
      ...generator(tables.item(3), ["Daily Trial", "Tower"]),
    ];
  }).toString()
})()`);

const filePattern = new URLPattern({ pathname: "/w/File\\::name" });

await Bun.write(
  "assets/armor.json",
  JSON.stringify(value, (key, value) => {
    if (typeof value === "string") {
      const url = URL.parse(value);
      if (url) {
        const res = filePattern.exec(url);
        if (res) {
          return `https://minecraft.wiki/images/${res.pathname.groups.name!}`;
        }
      }
    }
    return value;
  }, 2),
);
