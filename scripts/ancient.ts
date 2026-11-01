await using view = new Bun.WebView();

await view.navigate("about:blank");
await view.cdp("Emulation.setScriptExecutionDisabled", { value: true });

await view.navigate("https://minecraft.wiki/w/Dungeons:Ancient");

const value = await view.evaluate(`(${
  (() => {
    function* generator(table: HTMLTableElement) {
      for (const row of Iterator.from(table.tBodies.item(0)!.rows).drop(1)) {
        const name = row.cells
          .item(0)!
          .querySelector<HTMLElement>("[title]")!
          .title
          .replace("Dungeons:", "");
        const wiki = row.cells
          .item(0)!
          .querySelector("a")!.href;
        const icon = row.cells
          .item(0)!
          .querySelector("img")!
          .src;
        const runes = row.cells
          .item(1)!
          .querySelectorAll<HTMLElement>("[title]")
          .values()
          .map((e) => e.title)
          .toArray();
        const drops = new Set(
          row.cells
            .item(6)!
            .querySelectorAll<HTMLElement>("[title]")
            .values()
            .map((e) => e.title.replace("Dungeons:", "")),
        )
          .values()
          .toArray();
        yield {
          name,
          wiki,
          icon,
          runes,
          drops,
        };
      }
    }

    const table = document.querySelector<HTMLTableElement>(
      "#mw-content-text > div.mw-content-ltr.mw-parser-output > table.wikitable.sortable.mw-collapsible",
    )!;

    return [...generator(table)];
  }).toString()
})()`);

await Bun.write(
  "assets/ancient.json",
  JSON.stringify(value, (key, value) => {
    if (typeof value === "string") {
      if (URL.canParse(value)) {
        const url = new URL(value);
        url.search = "";
        return url.href;
      }
    }
    return value;
  }, 2)!,
);
