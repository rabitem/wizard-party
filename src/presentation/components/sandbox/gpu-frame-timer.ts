/** EXT_disjoint_timer_query_webgl2 constants (the extension object carries them too). */
interface TimerQueryExtension {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

const NANOSECONDS_PER_MS = 1e6;
/** Queries in flight before new frames stop being timed (results lag a few frames behind). */
const MAX_PENDING_QUERIES = 8;

/**
 * GPU time per frame from EXT_disjoint_timer_query_webgl2 (Chromium on desktop GPUs exposes it;
 * Safari and Firefox usually do not). A query spans everything the frame submitted between
 * begin() and end(); results arrive a few frames later and are returned by poll().
 */
export class GpuFrameTimer {
  private readonly pending: WebGLQuery[] = [];
  private active: WebGLQuery | null = null;

  private constructor(private readonly gl: WebGL2RenderingContext, private readonly ext: TimerQueryExtension) {}

  /** Null when the context is WebGL1 or the extension is missing. */
  static create(context: WebGLRenderingContext | WebGL2RenderingContext): GpuFrameTimer | null {
    if (typeof WebGL2RenderingContext === 'undefined' || !(context instanceof WebGL2RenderingContext)) return null;
    const ext = context.getExtension('EXT_disjoint_timer_query_webgl2') as TimerQueryExtension | null;
    return ext ? new GpuFrameTimer(context, ext) : null;
  }

  begin(): void {
    if (this.active || this.pending.length >= MAX_PENDING_QUERIES) return;
    const query = this.gl.createQuery();
    if (!query) return;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
    this.active = query;
  }

  end(): void {
    if (!this.active) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
  }

  /** GPU milliseconds of the oldest finished frame, or null when none finished (or the timing was disjoint). */
  poll(): number | null {
    const query = this.pending[0];
    if (!query || !this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE)) return null;
    this.pending.shift();
    const disjoint = Boolean(this.gl.getParameter(this.ext.GPU_DISJOINT_EXT));
    const nanoseconds = Number(this.gl.getQueryParameter(query, this.gl.QUERY_RESULT));
    this.gl.deleteQuery(query);
    return disjoint ? null : nanoseconds / NANOSECONDS_PER_MS;
  }

  dispose(): void {
    if (this.active) this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    for (const query of [this.active, ...this.pending]) if (query) this.gl.deleteQuery(query);
    this.active = null;
    this.pending.length = 0;
  }
}
