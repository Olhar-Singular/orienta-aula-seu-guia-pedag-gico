import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveActivityImageSrcs } from "@/lib/pdf/resolveActivityImageSrcs";
import type { EditableActivity } from "@/lib/pdf/editableActivity";

// ─── Helpers ────────────────────────────────────────────────────────────────

const BASE_HEADER = {
  schoolName: "",
  subject: "",
  teacherName: "",
  className: "",
  date: "",
  showStudentLine: false,
};

function makeActivity(srcs: (string | null)[]): EditableActivity {
  return {
    header: BASE_HEADER,
    globalShowSeparators: false,
    questions: srcs.map((src, i) => ({
      id: `q${i}`,
      number: i + 1,
      content: src
        ? [{ id: `b${i}`, type: "image" as const, src, width: 0.5, alignment: "center" as const }]
        : [{ id: `b${i}`, type: "text" as const, content: "plain text" }],
    })),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("resolveActivityImageSrcs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns activity unchanged when there are no image blocks", async () => {
    const activity = makeActivity([null]);
    const result = await resolveActivityImageSrcs(activity);
    expect(result).toBe(activity); // same reference — no copy made
  });

  it("replaces https:// src with data URL fetched from network", async () => {
    const fakeDataUrl = "data:image/png;base64,abc123";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["img"], { type: "image/png" })),
    }));

    // FileReader mock
    const readDataURLMock = vi.fn();
    const fileReaderInstances: any[] = [];
    vi.stubGlobal("FileReader", class {
      onload: ((e: any) => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      readAsDataURL(blob: Blob) {
        readDataURLMock(blob);
        fileReaderInstances.push(this);
        setTimeout(() => {
          this.onload?.({ target: { result: fakeDataUrl } });
        }, 0);
      }
    });

    const activity = makeActivity(["https://example.com/image.jpg"]);
    const result = await resolveActivityImageSrcs(activity);

    const imgBlock = result.questions[0].content[0];
    expect(imgBlock.type).toBe("image");
    if (imgBlock.type === "image") {
      expect(imgBlock.src).toBe(fakeDataUrl);
    }
  });

  it("leaves data: URLs unchanged (already resolved)", async () => {
    const dataUrl = "data:image/png;base64,existing";
    const activity = makeActivity([dataUrl]);
    const result = await resolveActivityImageSrcs(activity);

    const imgBlock = result.questions[0].content[0];
    if (imgBlock.type === "image") {
      expect(imgBlock.src).toBe(dataUrl);
    }
  });

  it("leaves invalid srcs unchanged when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const activity = makeActivity(["https://broken.example/img.jpg"]);
    const result = await resolveActivityImageSrcs(activity);

    const imgBlock = result.questions[0].content[0];
    if (imgBlock.type === "image") {
      // Original src preserved on fetch failure
      expect(imgBlock.src).toBe("https://broken.example/img.jpg");
    }
  });
});
