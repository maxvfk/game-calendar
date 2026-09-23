/** The capture day in a checked-in fixture name, never the build time. */
export function fixtureCaptureAt(path: string): string | null {
  const day = /-(\d{4}-\d{2}-\d{2})\.(?:html|json|md|xml)$/.exec(path)?.[1];
  return day === undefined ? null : `${day}T00:00:00.000Z`;
}
