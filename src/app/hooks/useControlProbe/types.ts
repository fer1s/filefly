// Optional args for a probe request: an explicit CSS point to hit-test, and/or a folder to probe
// at its own center. Null when the caller passed nothing.
export type ProbeArgs = { x?: number; y?: number; target?: string } | null;

// One probe request delivered over the control://probe event.
export type ProbeRequest = { id: number; args: ProbeArgs };
