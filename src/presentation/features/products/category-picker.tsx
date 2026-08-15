import { useMemo, useState } from "react";
import { CheckIcon, SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { buildCategoryGroups, categoryPath } from "@/application/catalog/category-tree";
import type { Category } from "@/domain/entities";

export function CategoryPicker({
  categories,
  selectedIds,
  readonly,
  allowInactiveSelection,
  onChange,
}: {
  categories: Category[];
  selectedIds: string[];
  readonly: boolean;
  allowInactiveSelection: boolean;
  onChange: (categoryIds: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const selected = new Set(selectedIds);
  const groups = useMemo(() => buildCategoryGroups(categories), [categories]);
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      options: group.options.filter((category) => {
        const isLegacySelection = allowInactiveSelection && selected.has(category.id);
        const parent = category.parent_id
          ? categories.find((item) => item.id === category.parent_id)
          : undefined;
        const dependencyActive = category.is_active && parent?.is_active !== false;
        if (!dependencyActive && !isLegacySelection) return false;
        if (!normalizedSearch) return true;
        return categoryPath(category, categories).toLocaleLowerCase().includes(normalizedSearch);
      }),
    }))
    .filter((group) => group.options.length > 0);

  const toggle = (categoryId: string, checked: boolean) => {
    onChange(
      checked
        ? [...new Set([...selectedIds, categoryId])]
        : selectedIds.filter((id) => id !== categoryId),
    );
  };

  return (
    <div className="space-y-3">
      {categories.length > 8 ? (
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search categories"
            className="pl-9"
            disabled={readonly}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search category path..."
            value={search}
          />
        </div>
      ) : null}
      <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border p-3">
        {visibleGroups.map((group) => {
          const hasChildren = group.options.some((option) => option.id !== group.parent.id);
          return (
            <section key={group.parent.id}>
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                {group.parent.name}
                {hasChildren ? <Badge variant="outline">Parent</Badge> : null}
                {!group.parent.is_active ? <Badge variant="destructive">Inactive</Badge> : null}
              </div>
              <div className={hasChildren ? "space-y-1 pl-4" : "space-y-1"}>
                {group.options.map((category) => {
                  const checked = selected.has(category.id);
                  const parentInactive = category.parent_id
                    ? categories.find((item) => item.id === category.parent_id)?.is_active === false
                    : false;
                  const dependencyActive = category.is_active && !parentInactive;
                  return (
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/60 ${checked ? "bg-primary/10" : ""}`}
                      key={category.id}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={readonly || (!dependencyActive && !checked)}
                        onCheckedChange={(value) => toggle(category.id, value === true)}
                      />
                      <span className="min-w-0 flex-1 text-sm">
                        {hasChildren ? category.name : group.parent.name}
                      </span>
                      {!category.is_active ? <Badge variant="destructive">Inactive</Badge> : null}
                      {parentInactive ? <Badge variant="destructive">Parent inactive</Badge> : null}
                      {checked ? <CheckIcon aria-label="Selected" className="size-4 text-primary" /> : null}
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}
        {!visibleGroups.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No matching categories.</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Products are assigned to leaf categories.</span>
        <span>{selectedIds.length} categories selected</span>
      </div>
      {selectedIds.length ? (
        <div className="flex flex-wrap gap-1">
          {categories
            .filter((category) => selected.has(category.id))
            .map((category) => (
              <Badge key={category.id} variant="secondary">
                {categoryPath(category, categories)}
              </Badge>
            ))}
        </div>
      ) : null}
    </div>
  );
}
