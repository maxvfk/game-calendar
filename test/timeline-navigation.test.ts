import { expect, test } from "bun:test";

test("mounted Timeline navigation and accessibility survive real React updates", async () => {
  // Isolate the DOM globals from the offline/account/storage test environment.
  const child = Bun.spawn([process.execPath, "run", "test/helpers/timeline-dom.tsx"], { stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  expect({ code, err }).toEqual({ code: 0, err: "" });
  expect(out).toContain("Timeline DOM navigation passed");
}, 15000);
