"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "./utils";
import { useUiCopy } from "./copy/use-ui-copy";
import "./select.css";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  popupDir?: "ltr" | "rtl" | "auto";
}
type Choice = {
  value: string;
  label: string;
  triggerLabel?: string;
  disabled: boolean;
  selected: boolean;
  group: string;
  hidden: boolean;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      className,
      children,
      id,
      style,
      popupDir,
      onChange,
      onInvalid,
      onFocus,
      onBlur,
      ...props
    },
    forwardedRef,
  ) {
    const accessibleLabel = props["aria-label"];
    const copy = useUiCopy();
    const generatedId = React.useId();
    const fieldId = id ?? generatedId;
    const menuId = `${fieldId}-options`;
    const native = React.useRef<HTMLSelectElement>(null);
    const trigger = React.useRef<HTMLButtonElement>(null);
    const search = React.useRef<HTMLInputElement>(null);
    const [choices, setChoices] = React.useState<Choice[]>([]);
    const [label, setLabel] = React.useState(accessibleLabel ?? "");
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [active, setActive] = React.useState(-1);
    const [error, setError] = React.useState("");
    const [palette, setPalette] = React.useState<React.CSSProperties>({});
    const [direction, setDirection] = React.useState<"ltr" | "rtl">("ltr");
    const typed = React.useRef({ value: "", time: 0 });
    const owner = React.useRef<string | undefined>(undefined);
    const searchable = choices.length > 12;
    const visible = choices.filter(
      (option) =>
        !option.hidden &&
        (!query ||
          option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ||
          (option.triggerLabel?.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ?? false) ||
          option.value.toLocaleLowerCase().includes(query.toLocaleLowerCase())),
    );
    const selected = choices.filter((option) => option.selected);
    const selectedText = selected
      .map((option) => option.triggerLabel || option.label)
      .join(copy.optionSeparator);
    const sync = React.useCallback(() => {
      if (!native.current) return;
      setChoices(
        Array.from(native.current.options, (option) => ({
          hidden: option.hidden,
          value: option.value,
          label: option.label,
          triggerLabel: option.dataset.triggerLabel || undefined,
          selected: option.selected,
          disabled:
            option.disabled ||
            (option.parentElement instanceof HTMLOptGroupElement &&
              option.parentElement.disabled),
          group:
            option.parentElement instanceof HTMLOptGroupElement
              ? option.parentElement.label
              : "",
        })),
      );
      const labels = trigger.current?.labels;
      if (!accessibleLabel && labels?.length) {
        const text = Array.from(labels, (element) => {
          const clone = element.cloneNode(true) as HTMLElement;
          clone
            .querySelectorAll(
              "[data-select-field], button, select, input, textarea",
            )
            .forEach((control) => control.remove());
          return clone.textContent?.trim() ?? "";
        }).join(" ");
        setLabel(text);
      }
    }, [accessibleLabel]);
    React.useEffect(() => {
      const form = native.current?.form;
      const reset = () => queueMicrotask(sync);
      form?.addEventListener("reset", reset);
      return () => form?.removeEventListener("reset", reset);
    }, [sync]);
    React.useImperativeHandle(forwardedRef, () => native.current!, []);
    React.useLayoutEffect(sync, [
      sync,
      children,
      props.value,
      props.defaultValue,
      props.disabled,
    ]);
    const { refs, floatingStyles } = useFloating({
      open,
      placement: "bottom-start",
      strategy: "fixed",
      transform: false,
      whileElementsMounted: autoUpdate,
      middleware: [
        offset(6),
        flip({ padding: 12 }),
        shift({ padding: 12 }),
        size({
          padding: 12,
          apply({ availableHeight, availableWidth, rects, elements }) {
            Object.assign(elements.floating.style, {
              width: `${Math.min(Math.max(rects.reference.width, searchable ? 280 : 196), availableWidth)}px`,
              maxHeight: `${Math.min(420, availableHeight)}px`,
            });
          },
        }),
      ],
    });
    const close = React.useCallback((restore = true) => {
      setOpen(false);
      setQuery("");
      if (restore) trigger.current?.focus();
    }, []);
    const show = (direction = 1) => {
      if (props.disabled) return;
      const computed = getComputedStyle(trigger.current!);
      // Portaled menus keep their anchor's scoped palette, including mixed website sections.
      setPalette({
        ...Object.fromEntries(
          Array.from(computed)
            .filter((name) =>
              /^--(md-sys-color-|m3-color-|brand-|site-|web-|admin-)/.test(
                name,
              ),
            )
            .map((name) => [name, computed.getPropertyValue(name)]),
        ),
        colorScheme: computed.colorScheme,
      });
      const resolvedPopupDir =
        popupDir && popupDir !== "auto"
          ? popupDir
          : getComputedStyle(document.documentElement).direction === "rtl" ||
              computed.direction === "rtl"
            ? "rtl"
            : "ltr";
      setDirection(resolvedPopupDir);
      owner.current =
        trigger.current
          ?.closest("[data-dialog-scope]")
          ?.getAttribute("data-dialog-scope") ?? undefined;
      setOpen(true);
      setQuery("");
      const options = choices.filter((option) => !option.hidden);
      const current = options.findIndex(
        (option) => option.selected && !option.disabled,
      );
      const enabled = options
        .map((option, index) => (option.disabled ? -1 : index))
        .filter((index) => index >= 0);
      setActive(
        current >= 0
          ? current
          : ((direction > 0 ? enabled[0] : enabled.at(-1)) ?? -1),
      );
    };
    React.useEffect(() => {
      if (!open) return;
      if (searchable) search.current?.focus();
      const dismiss = (event: PointerEvent) => {
        if (
          !refs.floating.current?.contains(event.target as Node) &&
          !trigger.current?.contains(event.target as Node)
        )
          close(false);
      };
      const leave = (event: FocusEvent) => {
        if (
          !refs.floating.current?.contains(event.target as Node) &&
          !trigger.current?.contains(event.target as Node)
        )
          close(false);
      };
      document.addEventListener("pointerdown", dismiss, true);
      document.addEventListener("focusin", leave);
      return () => {
        document.removeEventListener("pointerdown", dismiss, true);
        document.removeEventListener("focusin", leave);
      };
    }, [open, searchable, close, refs.floating]);
    React.useEffect(() => {
      if (open && active >= 0)
        document
          .getElementById(`${menuId}-${active}`)
          ?.scrollIntoView({ block: "nearest" });
    }, [active, open, menuId]);
    const choose = (choice: Choice) => {
      const element = native.current;
      if (!element || element.matches(":disabled") || choice.disabled) return;
      if (props.multiple) {
        for (const option of Array.from(element.options))
          if (option.value === choice.value) option.selected = !choice.selected;
      } else
        Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          "value",
        )!.set!.call(element, choice.value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      queueMicrotask(sync);
      setError("");
      if (!props.multiple) close();
    };
    const keydown = (event: React.KeyboardEvent) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === "Escape" && open) {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key === "Tab" && open) {
        event.preventDefault();
        event.stopPropagation();
        close(false);
        const scope =
          trigger.current?.closest("[data-dialog-scope]") ?? document.body;
        const items = Array.from(
          scope.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
          ),
        ).filter(
          (element) =>
            element.getClientRects().length &&
            element.tabIndex >= 0 &&
            !element.closest(
              '[hidden], [inert], [aria-hidden="true"], [data-select-popup]',
            ),
        );
        const next =
          items.indexOf(trigger.current!) + (event.shiftKey ? -1 : 1);
        (items[next] ?? trigger.current)?.focus();
        return;
      }
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        if (!open) {
          show(event.key === "ArrowUp" || event.key === "End" ? -1 : 1);
          return;
        }
        const enabled = visible
          .map((option, index) => (option.disabled ? -1 : index))
          .filter((index) => index >= 0);
        const current = enabled.indexOf(active);
        setActive(
          event.key === "Home"
            ? enabled[0]
            : event.key === "End"
              ? enabled.at(-1)!
              : (enabled[
                  (current +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    enabled.length) %
                    enabled.length
                ] ?? -1),
        );
      } else if (
        event.key === "Enter" ||
        (event.key === " " && event.target === trigger.current)
      ) {
        event.preventDefault();
        event.stopPropagation();
        if (!open) show();
        else if (visible[active]) choose(visible[active]);
      } else if (
        event.target === trigger.current &&
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        const now = performance.now();
        const text =
          now - typed.current.time < 700
            ? typed.current.value + event.key
            : event.key;
        typed.current = { value: text, time: now };
        const repeated = text
          .toLocaleLowerCase()
          .split("")
          .every((letter) => letter === text[0].toLocaleLowerCase());
        const prefix = (repeated ? event.key : text).toLocaleLowerCase();
        const options = open ? visible : choices;
        const start = repeated
          ? (open ? active : options.findIndex((option) => option.selected)) + 1
          : 0;
        const found = options
          .map((_, index) => (index + start) % options.length)
          .find(
            (index) =>
              !options[index].disabled &&
              !options[index].hidden &&
              options[index].label.toLocaleLowerCase().startsWith(prefix),
          );
        if (found !== undefined) {
          if (open) setActive(found);
          else choose(options[found]);
        }
      }
    };
    return (
      <div data-select-field className="m3-select-field">
        <button
          ref={(element) => {
            trigger.current = element;
            refs.setReference(element);
          }}
          id={fieldId}
          type="button"
          role="combobox"
          dir={props.dir}
          aria-label={accessibleLabel || label || copy.selectOption}
          aria-labelledby={props["aria-labelledby"]}
          aria-describedby={
            error ? `${fieldId}-error` : props["aria-describedby"]
          }
          aria-invalid={props["aria-invalid"] || !!error}
          aria-required={props.required}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? menuId : undefined}
          aria-activedescendant={
            open && active >= 0 ? `${menuId}-${active}` : undefined
          }
          disabled={props.disabled}
          data-ui="text-field"
          className={cn("m3-select-trigger", className)}
          style={style}
          onClick={() => (open ? close() : show())}
          onKeyDown={keydown}
          onFocus={() =>
            native.current?.dispatchEvent(
              new FocusEvent("focusin", { bubbles: true }),
            )
          }
          onBlur={() =>
            native.current?.dispatchEvent(
              new FocusEvent("focusout", { bubbles: true }),
            )
          }
        >
          <bdi dir="auto" className="m3-select-value">
            {selectedText || copy.selectOption}
          </bdi>
          <ChevronDown aria-hidden className="m3-select-chevron" />
        </button>
        <select
          {...props}
          id={`${fieldId}-native`}
          data-select-native
          hidden
          aria-hidden="true"
          aria-label={undefined}
          aria-labelledby={undefined}
          tabIndex={-1}
          ref={native}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(event) => {
            onChange?.(event);
            queueMicrotask(sync);
          }}
          onInvalid={(event) => {
            onInvalid?.(event);
            if (!event.defaultPrevented) {
              event.preventDefault();
              setError(
                native.current?.validity.valueMissing
                  ? "required"
                  : (native.current?.validationMessage ?? ""),
              );
              trigger.current?.focus();
            }
          }}
        >
          {children}
        </select>
        {error && (
          <p
            id={`${fieldId}-error`}
            role="alert"
            className="m3-select-error"
            dir="auto"
          >
            {error === "required" ? copy.selectRequired : error}
          </p>
        )}
        {open &&
          createPortal(
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, ...palette }}
              data-select-popup
              dir={direction}
              data-dialog-scope-owner={owner.current}
              className="m3-select-popup"
              onKeyDown={keydown}
            >
              {searchable && (
                <div className="m3-select-search">
                  <Search aria-hidden />
                  <input
                    ref={search}
                    dir="auto"
                    type="search"
                    value={query}
                    placeholder={copy.searchOptions}
                    aria-label={copy.searchOptions}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setActive(0);
                    }}
                    aria-controls={menuId}
                    aria-activedescendant={
                      active >= 0 ? `${menuId}-${active}` : undefined
                    }
                  />
                </div>
              )}
              <div
                role="listbox"
                id={menuId}
                aria-label={accessibleLabel || label || copy.selectOption}
                aria-multiselectable={props.multiple || undefined}
                data-overlay-scroll
                className="m3-select-options"
              >
                {visible.map((option, index) => (
                  <React.Fragment key={`${option.value}-${index}`}>
                    {option.group &&
                      visible[index - 1]?.group !== option.group && (
                        <div role="presentation" className="m3-select-group">
                          <bdi dir="auto">{option.group}</bdi>
                        </div>
                      )}
                    <div
                      role="option"
                      id={`${menuId}-${index}`}
                      data-option-value={option.value}
                      aria-selected={option.selected}
                      aria-disabled={option.disabled || undefined}
                      data-active={active === index}
                      className="m3-select-option"
                      onPointerMove={() => !option.disabled && setActive(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => choose(option)}
                    >
                      <bdi dir="auto">{option.label}</bdi>
                      {option.selected && <Check aria-hidden />}
                    </div>
                  </React.Fragment>
                ))}
                {!visible.length && (
                  <p role="status" className="m3-select-empty">
                    {copy.noOptions}
                  </p>
                )}
              </div>
              {props.multiple && (
                <div className="m3-select-footer">
                  <button type="button" onClick={() => close()}>
                    <X aria-hidden />
                    {copy.close}
                  </button>
                </div>
              )}
            </div>,
            document.body,
          )}
      </div>
    );
  },
);
