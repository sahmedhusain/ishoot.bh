"use client";

import * as React from "react";
import { Search,ChevronDown,Sparkles } from "lucide-react";
import { ICON_PAGE_SIZE, PICKABLE_ICONS, POPULAR_ICON_NAMES } from "../../constants/icons";

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  initialOpen?:boolean;
}

const ALL_ICON_NAMES = Object.keys(PICKABLE_ICONS);
const POPULAR_ICONS: readonly string[] = POPULAR_ICON_NAMES;

export function IconPicker({ value, onChange, placeholder = "Select icon", initialOpen=false }: IconPickerProps) {
  const [isOpen, setIsOpen] = React.useState(initialOpen);
  const [page,setPage]=React.useState(0);
  const menuId=React.useId();
  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<"popular" | "all">("popular");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const matches = React.useMemo(()=>search.trim() ? ALL_ICON_NAMES.filter(name=>name.toLowerCase().includes(search.toLowerCase().trim())) : tab === "popular" ? POPULAR_ICONS : ALL_ICON_NAMES,[search,tab]);
  const displayedIcons=matches.slice(page*ICON_PAGE_SIZE,(page+1)*ICON_PAGE_SIZE);
  React.useEffect(()=>setPage(0),[search,tab]);

  const SelectedIcon = value ? PICKABLE_ICONS[value] ?? null : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-[#0B1210] border border-slate-200 dark:border-white/10 rounded-xl text-xs hover:border-[#09937F] focus:outline-none focus:ring-2 focus:ring-[#09937F]/30 transition-all cursor-pointer shadow-2xs group"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 group-hover:border-[#09937F]/50 transition-colors">
            {SelectedIcon ? (
              <SelectedIcon className="w-4 h-4 text-[#09937F]" />
            ) : (
              <Sparkles className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <span className="font-semibold text-slate-800 dark:text-neutral-200">
            {value || placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#09937F]" : ""}`} />
      </button>

      {isOpen && (
          <div id={menuId} role="dialog" aria-label="Select icon" onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();setIsOpen(false);}}}
            className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-[#111C19] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col w-[320px] max-w-[90vw]"
          >
            {/* Search Header */}
            <div className="p-3 border-b border-slate-100 dark:border-white/10 space-y-2 bg-slate-50/50 dark:bg-black/20">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  aria-label="Search icons"
                  placeholder="Search icons..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#0B1210] border border-slate-200 dark:border-white/10 rounded-lg text-xs outline-none focus:border-[#09937F] text-slate-900 dark:text-white"
                />
              </div>

              {!search && (
                <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-white/5 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setTab("popular")}
                    className={`flex-1 py-1 rounded-md text-[11px] font-bold transition-all ${
                      tab === "popular"
                        ? "bg-white dark:bg-[#014842] text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Popular
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("all")}
                    className={`flex-1 py-1 rounded-md text-[11px] font-bold transition-all ${
                      tab === "all"
                        ? "bg-white dark:bg-[#014842] text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    All Icons
                  </button>
                </div>
              )}
            </div>

            <nav aria-label="Icon result pages" className="flex gap-3 px-3 py-2 text-xs"><span>{matches.length} icons · {page+1}/{Math.max(1,Math.ceil(matches.length/ICON_PAGE_SIZE))}</span>{page>0?<button type="button" onClick={()=>setPage(page-1)}>Previous</button>:null}{(page+1)*ICON_PAGE_SIZE<matches.length?<button type="button" onClick={()=>setPage(page+1)}>Next</button>:null}</nav>
            {/* Icon Grid */}
            <div className="p-3 max-h-[220px] overflow-y-auto grid grid-cols-5 gap-1.5 custom-scrollbar">
              {displayedIcons.map((iconName) => {
                const IconComp = PICKABLE_ICONS[iconName];
                if (!IconComp) return null;

                const isSelected = value === iconName;

                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => {
                      onChange(iconName);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`p-2.5 flex flex-col items-center justify-center rounded-xl border transition-all group/btn ${
                      isSelected
                        ? "bg-[#014842] border-[#09937F] text-white shadow-md"
                        : "border-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-neutral-300 hover:border-slate-200 dark:hover:border-white/10"
                    }`}
                    title={iconName}
                  >
                    <IconComp className={`w-5 h-5 transition-transform group-hover/btn:scale-110 ${isSelected ? "text-[#5EEAD4]" : ""}`} />
                  </button>
                );
              })}

              {displayedIcons.length === 0 && (
                <div className="col-span-5 py-6 text-center text-xs text-slate-400">
                  No matching icons found
                </div>
              )}
            </div>
          </div>
      )}
    </div>
  );
}
