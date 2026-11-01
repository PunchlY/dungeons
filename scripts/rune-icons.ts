await using view = new Bun.WebView();

await view.navigate("about:blank");
await view.cdp("Emulation.setScriptExecutionDisabled", { value: true });

await view.navigate("https://minecraft.wiki/w/Dungeons:Illageralt");

const value = await view.evaluate(`(${
  (() => {
    return Object.fromEntries(
      document.querySelector(
        "#mw-content-text > div.mw-content-ltr.mw-parser-output > ul:nth-child(16)",
      )!
        .querySelectorAll<HTMLElement>("[title]")
        .values()
        .map((e) => {
          return [
            e.title.replace("Rune ", ""),
            e.querySelector("img")!.src,
          ];
        }),
    );
  }).toString()
})()`);

await Bun.write(
  "assets/rune-icons.json",
  JSON.stringify(value, (key, value) => {
    if (typeof value === "string") {
      if (URL.canParse(value)) {
        const url = new URL(value);
        url.search = "";
        return url.href;
      }
    }
    return value;
  }, 2),
);
