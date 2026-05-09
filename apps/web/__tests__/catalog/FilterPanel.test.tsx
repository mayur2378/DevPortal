import { render, screen, fireEvent } from "@testing-library/react";
import { FilterPanel } from "@/components/catalog/FilterPanel";
import { describe, it, expect, vi } from "vitest";

describe("FilterPanel", () => {
  const domains = [{ id: "d1", name: "Customer" }];
  const tags = [{ id: "t1", name: "healthcare" }];

  it("renders visibility, type, lifecycle filters", () => {
    render(<FilterPanel domains={domains} tags={tags} filters={{}} onChange={vi.fn()} />);
    expect(screen.getByText("Domain")).toBeInTheDocument();
    expect(screen.getByText("Visibility")).toBeInTheDocument();
    expect(screen.getByText("API Type")).toBeInTheDocument();
  });

  it("calls onChange when visibility chip clicked", () => {
    const onChange = vi.fn();
    render(<FilterPanel domains={domains} tags={tags} filters={{}} onChange={onChange} />);
    fireEvent.click(screen.getByText("PUBLIC"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ visibility: "PUBLIC" }));
  });
});
