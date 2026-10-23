"use client";

import { Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { panel, secondaryButton } from "./ui";

export type DropdownItem =
  | {
      type?: "item";
      id: string;
      label: ReactNode;
      icon?: ReactNode;
      /** Set on every item to make this a value picker: the selected one shows a check. */
      selected?: boolean;
      onSelect: () => void;
      /** Optional trailing button (e.g. delete) that doesn't close the menu. */
      action?: { icon: ReactNode; label: string; onClick: () => void };
    }
  | { type: "separator"; id: string };

interface Props {
  /** Accessible name for the trigger and the menu. */
  label: string;
  /** Trigger content; a chevron is added automatically. */
  trigger: ReactNode;
  items: readonly DropdownItem[];
  /** Which trigger edge the menu lines up with. */
  align?: "start" | "end";
  /** Tailwind width class for the menu. */
  menuWidth?: string;
  triggerClassName?: string;
  title?: string;
}

/** The one dropdown used across the app: action menus and value pickers. */
export default function Dropdown({ label, trigger, items, align = "start", menuWidth = "w-56", triggerClassName, title }: Props) {
  const [open, setOpen] = useState(false);
  const [placeAbove, setPlaceAbove] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const isPicker = items.some((i) => i.type !== "separator" && i.selected !== undefined);
  // Keep labels aligned: if any item has an icon, every item reserves the icon slot.
  const hasIcons = items.some((i) => i.type !== "separator" && i.icon);
  const selectable = items.filter((i): i is Extract<DropdownItem, { onSelect: () => void }> => i.type !== "separator");

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const focusItem = (index: number) => {
    const count = selectable.length;
    if (count) itemRefs.current[((index % count) + count) % count]?.focus();
  };

  // Flip above the trigger when there isn't room below, then focus the selected (or first) item.
  useLayoutEffect(() => {
    if (!open) return;
    const trig = triggerRef.current?.getBoundingClientRect();
    const menuH = menuRef.current?.offsetHeight ?? 0;
    if (trig) setPlaceAbove(trig.bottom + menuH + 8 > window.innerHeight && trig.top > menuH + 8);
    const selectedIndex = selectable.findIndex((i) => i.selected);
    itemRefs.current[Math.max(0, selectedIndex)]?.focus();
    // Only when opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = itemRefs.current.indexOf(document.activeElement as HTMLButtonElement);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusItem(current + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusItem(current - 1);
        break;
      case "Home":
        e.preventDefault();
        focusItem(0);
        break;
      case "End":
        e.preventDefault();
        focusItem(selectable.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
      case "Delete":
      case "Backspace":
        if (current >= 0 && selectable[current]?.action) {
          e.preventDefault();
          selectable[current].action!.onClick();
        }
        break;
    }
  };

  let itemIndex = 0;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        title={title}
        className={triggerClassName ?? `${secondaryButton} h-9 px-3 text-sm`}
      >
        {trigger}
        <ChevronDown size={14} className={`shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={`${panel} absolute z-50 rounded-2xl p-1.5 ${menuWidth} ${align === "end" ? "right-0" : "left-0"} ${
            placeAbove ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {items.map((item) => {
            if (item.type === "separator") return <div key={item.id} role="separator" className="my-1 border-t border-white/8" />;
            const index = itemIndex++;
            return (
              <div key={item.id} className="group flex items-center rounded-xl focus-within:bg-plum-3 hover:bg-plum-3">
                <button
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  type="button"
                  role={isPicker ? "menuitemradio" : "menuitem"}
                  aria-checked={isPicker ? !!item.selected : undefined}
                  tabIndex={-1}
                  onClick={() => {
                    item.onSelect();
                    close();
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left text-sm text-cream focus:outline-none"
                >
                  {hasIcons && <span className="grid w-4 shrink-0 place-items-center">{item.icon}</span>}
                  <span className={`min-w-0 flex-1 truncate ${item.selected ? "font-semibold" : ""}`}>{item.label}</span>
                  {isPicker && <Check size={15} className={`shrink-0 text-marigold ${item.selected ? "" : "invisible"}`} />}
                </button>
                {item.action && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.action!.onClick();
                    }}
                    aria-label={item.action.label}
                    title={item.action.label}
                    className="mr-1 rounded-lg p-1.5 text-cream/40 opacity-0 transition hover:text-rani group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 pointer-coarse:opacity-100"
                  >
                    {item.action.icon}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
