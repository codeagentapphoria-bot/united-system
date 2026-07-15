import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function getPageItems(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let start = Math.max(2, page - 1);
  let end = Math.min(totalPages - 1, page + 1);

  if (page <= 3) {
    start = 2;
    end = 4;
  } else if (page >= totalPages - 2) {
    start = totalPages - 3;
    end = totalPages - 1;
  }

  const items = [1];
  if (start > 2) items.push("start-ellipsis");
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < totalPages - 1) items.push("end-ellipsis");
  items.push(totalPages);
  return items;
}

export function CompactPagination({ page = 1, totalPages = 1, total = 0, perPage = 10, onPageChange }) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages);
  const start = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const end = total === 0 ? 0 : Math.min(total, safePage * perPage);
  const pageItems = getPageItems(safePage, safeTotalPages);

  const goToPage = (nextPage) => {
    if (nextPage >= 1 && nextPage <= safeTotalPages && nextPage !== safePage) {
      onPageChange?.(nextPage);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 py-3 border-t">
      <div className="text-sm text-muted-foreground">
        Showing {start}-{end} of {total}
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() => goToPage(safePage - 1)}
          disabled={safePage === 1}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pageItems.map((item) =>
          typeof item === "number" ? (
            <Button
              key={item}
              type="button"
              variant={item === safePage ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => goToPage(item)}
              aria-current={item === safePage ? "page" : undefined}
            >
              {item}
            </Button>
          ) : (
            <span key={item} className="px-2 text-sm text-muted-foreground" aria-hidden="true">
              ...
            </span>
          )
        )}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() => goToPage(safePage + 1)}
          disabled={safePage === safeTotalPages}
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
