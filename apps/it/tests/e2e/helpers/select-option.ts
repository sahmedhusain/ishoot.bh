import type { Locator } from "@playwright/test";

type Option = string | { label?: string; value?: string; index?: number };

export async function selectOption(
  control: Locator,
  option: Option | string[] | Exclude<Option, string>[],
  options?: { force?: boolean; timeout?: number },
) {
  const tag = await control.evaluate((element) => element.tagName);
  const custom =
    tag === "SELECT"
      ? (await control.getAttribute("data-select-native")) !== null
      : (await control.getAttribute("role")) === "combobox";
  if (!custom || options?.force) return control.selectOption(option, options);
  const field = control.locator("..");
  const native = field.locator("select[data-select-native]");
  const trigger = field.getByRole("combobox");
  const wanted = await native.evaluate((element, input) => {
    const select = element as HTMLSelectElement;
    return (Array.isArray(input) ? input : [input]).map((choice) => {
      const selected = Array.from(select.options).find((candidate, index) =>
        typeof choice === "string"
          ? candidate.value === choice
          : choice.value !== undefined
            ? candidate.value === choice.value
            : choice.label !== undefined
              ? candidate.label === choice.label
              : index === choice.index,
      );
      if (!selected)
        throw new Error("The requested select option does not exist");
      return { value: selected.value, label: selected.label };
    });
  }, option);
  for (const choice of wanted) {
    if ((await trigger.getAttribute("aria-expanded")) !== "true")
      await trigger.click();
    const popup = control.page().locator("[data-select-popup]");
    const search = popup.getByRole("searchbox");
    if (await search.count()) await search.fill(choice.label);
    await popup
      .locator(`[data-option-value=${JSON.stringify(choice.value)}]`)
      .click();
  }
  if ((await trigger.getAttribute("aria-expanded")) === "true")
    await trigger.press("Escape");
  return native.evaluate((element) =>
    Array.from(
      (element as HTMLSelectElement).selectedOptions,
      (item) => item.value,
    ),
  );
}
