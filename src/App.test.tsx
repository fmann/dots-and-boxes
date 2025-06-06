import { render, fireEvent, screen, act } from "@testing-library/react";
import App from "./App";
import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock canvas getContext for jsdom
defineGlobalCanvasMock();

function defineGlobalCanvasMock() {
  beforeAll(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: () => ({
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        fillRect: vi.fn(),
        set fillStyle(_value: any) {},
        set strokeStyle(_value: any) {},
        set lineWidth(_value: any) {},
        set shadowColor(_value: any) {},
        set shadowBlur(_value: any) {},
        set globalAlpha(_value: any) {},
      }),
    });
  });
}

vi.useFakeTimers();

describe("Dots and Boxes Computer Turn", () => {
  it("should switch to computer's turn after player move and show the correct text", () => {
    render(<App />);
    const canvas = document.querySelector("canvas");
    expect(canvas).toBeTruthy();
    act(() => {
      fireEvent.click(canvas!, { clientX: 100, clientY: 100 });
    });
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(screen.getByText(/computer's turn/i)).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText(/your turn/i)).not.toBeNull();
  });
});
