import { CAMERA_CONFIG } from '@/presentation/config/layout.config';
import type { CameraEnvelope } from '@/presentation/config/themed-environment.config';
import type { TableFitPoint } from './table-fit-points';

type Vec3 = readonly [number, number, number];

const DEG_TO_RAD = Math.PI / 180;

function distanceBetween(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export interface FittedCamera {
  position: [number, number, number];
  /** Orbit target the camera looks at (the table centre, shifted for portrait framing) */
  target: [number, number, number];
  distance: number;
  /**
   * Camera zoom (1 = preset FOV). Below 1 only when the room envelope leaves no other way to
   * fit the table; camera-relative content (the hand) compensates with 1 / zoom.
   */
  zoom: number;
}

export interface CameraFramingInput {
  presetPosition: Vec3;
  target: Vec3;
  fovDeg: number;
  aspect: number;
  /** Table-plane points (world x, z) that must stay inside the view (table-fit-points.ts) */
  fitPoints: readonly TableFitPoint[];
  envelope?: CameraEnvelope;
  /** Vertical NDC (-1..1) where the table centre should appear; 0 = screen centre */
  tableCenterNdcY?: number;
}

/**
 * The fit points in the camera's horizontal frame: sideways offset and offset toward the camera
 * (relative to the target), plus the visible half-width per unit of depth at zoom 1.
 */
interface FitModel {
  widthPerDepth: number;
  points: ReadonlyArray<readonly [lateral: number, toward: number]>;
}

interface View {
  elevation: number;
  distance: number;
  zoom: number;
}

function createFitModel(input: CameraFramingInput, presetDirection: Vec3): FitModel {
  const { fitPoints, target, fovDeg, aspect } = input;
  const horizontal = Math.hypot(presetDirection[0], presetDirection[2]);
  const [hx, hz] = horizontal > 1e-9 ? [presetDirection[0] / horizontal, presetDirection[2] / horizontal] : [0, 1];
  return {
    widthPerDepth: Math.tan((fovDeg * DEG_TO_RAD) / 2) * aspect,
    points: fitPoints.map(([x, z]) => {
      const dx = x - target[0], dz = z - target[2];
      return [dx * hz - dz * hx, dx * hx + dz * hz] as const;
    }),
  };
}

/**
 * Distance at which every fit point is in view at zoom 1, looking down at `elevation`. A point
 * `toward` the camera is closer by toward*cos(elevation), so it needs a little more distance.
 */
function fitDistanceAt(model: FitModel, elevation: number): number {
  const cos = Math.cos(elevation);
  return model.points.reduce((needed, [lateral, toward]) => Math.max(needed, Math.abs(lateral) / model.widthPerDepth + toward * cos), 0);
}

/** Largest zoom (<= 1) that keeps every fit point in view from `distance` at `elevation` */
function zoomAt(model: FitModel, elevation: number, distance: number): number {
  const cos = Math.cos(elevation);
  return model.points.reduce((zoom, [lateral, toward]) => {
    if (Math.abs(lateral) < 1e-9) return zoom;
    const depth = Math.max(1e-3, distance - toward * cos);
    return Math.min(zoom, (depth * model.widthPerDepth) / Math.abs(lateral));
  }, 1);
}

/** Unit direction from target with the preset azimuth and a given elevation */
function directionAtElevation(presetDirection: Vec3, elevation: number): Vec3 {
  const horizontal = Math.hypot(presetDirection[0], presetDirection[2]) || 1;
  const cos = Math.cos(elevation);
  return [(presetDirection[0] / horizontal) * cos, Math.sin(elevation), (presetDirection[2] / horizontal) * cos];
}

const SEARCH_STEPS = 40;
const MAX_ELEVATION = 85 * DEG_TO_RAD;

/**
 * Bisection between an elevation that passes and one that fails (in either order): the passing
 * elevation nearest the boundary.
 */
function boundaryElevation(pass: number, fail: number, passes: (elevation: number) => boolean): number {
  let passing = pass, failing = fail;
  for (let i = 0; i < SEARCH_STEPS; i++) {
    const mid = (passing + failing) / 2;
    if (passes(mid)) passing = mid;
    else failing = mid;
  }
  return passing;
}

/**
 * Viewing elevation, distance and zoom under the envelope height (heightBudget above target):
 * 1. the preset elevation, pulled back until the table fits;
 * 2. if that rises above the envelope: a flatter view at full distance, as long as the top edge
 *    of the view still points down (nothing above the camera can enter the picture);
 * 3. otherwise the camera stays at the envelope height, comes closer and widens the view with
 *    zoom < 1, steep enough that the widened top edge still points down.
 */
function solveElevation(model: FitModel, presetElevation: number, presetDistance: number, fovDeg: number, heightBudget: number): View {
  const fit = (elevation: number) => Math.max(presetDistance, fitDistanceAt(model, elevation));
  const presetFit = fit(presetElevation);
  if (!(heightBudget > 0) || Math.sin(presetElevation) * presetFit <= heightBudget) {
    return { elevation: presetElevation, distance: presetFit, zoom: 1 };
  }

  const margin = CAMERA_CONFIG.ENVELOPE.TOP_RAY_MARGIN_DEG * DEG_TO_RAD;
  const minElevation = (fovDeg / 2) * DEG_TO_RAD + margin;
  const underEnvelope = (elevation: number) => Math.sin(elevation) * fit(elevation) <= heightBudget;
  if (minElevation < presetElevation && underEnvelope(minElevation)) {
    // Highest elevation (closest to the preset) whose fitted camera is still under the envelope
    const elevation = boundaryElevation(minElevation, presetElevation, underEnvelope);
    return { elevation, distance: fit(elevation), zoom: 1 };
  }

  const tanHalf = Math.tan((fovDeg * DEG_TO_RAD) / 2);
  const widenedAt = (elevation: number): View => {
    const distance = heightBudget / Math.sin(elevation);
    return { elevation, distance, zoom: zoomAt(model, elevation, distance) };
  };
  const topRayPointsDown = (elevation: number) => elevation - margin >= Math.atan(tanHalf / widenedAt(elevation).zoom);
  const elevation = topRayPointsDown(MAX_ELEVATION) ? boundaryElevation(MAX_ELEVATION, minElevation, topRayPointsDown) : MAX_ELEVATION;
  return widenedAt(elevation);
}

/** Inside the room's walls: a camera further out comes closer and widens the view instead */
function limitToRadius(model: FitModel, view: View, radiusBudget: number): View {
  const horizontal = Math.cos(view.elevation) * view.distance;
  if (!(radiusBudget > 0) || horizontal <= radiusBudget) return view;
  const distance = radiusBudget / Math.cos(view.elevation);
  return { elevation: view.elevation, distance, zoom: Math.min(view.zoom, zoomAt(model, view.elevation, distance)) };
}

/**
 * Frames the table for a viewport inside a room:
 * 1. pull the preset camera back along its view ray until every fit point (seat plates) is in
 *    view, with perspective (a seat on the near half of the table needs more room);
 * 2. under the room's envelope (beams, rafters, pergolas) flatten the view or, failing that,
 *    widen it with zoom (solveElevation), and stay inside the walls (limitToRadius);
 * 3. optionally slide camera and target along the table so the table centre sits at
 *    tableCenterNdcY (portrait: the free band between HUD and hand), never through a wall.
 */
export function frameCamera(input: CameraFramingInput): FittedCamera {
  const { presetPosition, target, fovDeg, aspect, envelope, tableCenterNdcY = 0 } = input;
  const presetDistance = distanceBetween(presetPosition, target);
  const presetTarget: [number, number, number] = [target[0], target[1], target[2]];
  if (!(Number.isFinite(aspect) && aspect > 0) || presetDistance === 0) {
    return { position: [presetPosition[0], presetPosition[1], presetPosition[2]], target: presetTarget, distance: presetDistance, zoom: 1 };
  }
  const presetDirection: Vec3 = [
    (presetPosition[0] - target[0]) / presetDistance,
    (presetPosition[1] - target[1]) / presetDistance,
    (presetPosition[2] - target[2]) / presetDistance,
  ];
  const presetElevation = Math.asin(presetDirection[1]);
  const model = createFitModel(input, presetDirection);
  const heightBudget = envelope ? envelope.maxHeight - target[1] : Infinity;
  const radiusBudget = envelope ? envelope.maxHorizontalRadius - Math.hypot(target[0], target[2]) : Infinity;
  const view = limitToRadius(model, solveElevation(model, presetElevation, presetDistance, fovDeg, heightBudget), radiusBudget);

  const isPreset = view.elevation === presetElevation && view.distance === presetDistance && view.zoom === 1;
  const direction = isPreset ? presetDirection : directionAtElevation(presetDirection, view.elevation);
  const position = isPreset
    ? [presetPosition[0], presetPosition[1], presetPosition[2]]
    : [target[0] + direction[0] * view.distance, target[1] + direction[1] * view.distance, target[2] + direction[2] * view.distance];
  const horizontal = Math.hypot(direction[0], direction[2]) || 1;
  const centreShift = getTableCenterShift({ ndcY: tableCenterNdcY, distance: view.distance, fovDeg, zoom: view.zoom, elevation: view.elevation });
  const shift = Math.min(centreShift, Math.max(0, radiusBudget - horizontal * view.distance));
  const dx = (direction[0] / horizontal) * shift, dz = (direction[2] / horizontal) * shift;
  return {
    position: [position[0] + dx, position[1], position[2] + dz],
    target: [target[0] + dx, target[1], target[2] + dz],
    distance: view.distance,
    zoom: view.zoom,
  };
}

/**
 * Horizontal slide (toward the camera) that moves the table centre to a vertical NDC position.
 * Sliding camera and target together keeps the viewing angle, the distance and the height.
 * The centre then lies `shift` behind the target: up by shift*sin(e), deeper by shift*cos(e),
 * so ndc = shift*sin*zoom / ((distance + shift*cos) * tan(fov/2)), solved for shift.
 */
function getTableCenterShift(params: { ndcY: number; distance: number; fovDeg: number; zoom: number; elevation: number }): number {
  const { ndcY, distance, fovDeg, zoom, elevation } = params;
  const tan = Math.tan((fovDeg * DEG_TO_RAD) / 2);
  const denominator = Math.sin(elevation) * zoom - ndcY * Math.cos(elevation) * tan;
  if (ndcY === 0 || denominator <= 0) return 0;
  return (ndcY * distance * tan) / denominator;
}

/**
 * Keeps an orbiting camera inside the room envelope by moving it toward the target along its
 * view ray (never by raising or tilting it), so zooming out or tilting up stops under the
 * beams and inside the walls. Returns the scale applied to the target-to-camera offset (1 =
 * unchanged).
 */
export function getEnvelopeClampScale(position: Vec3, target: Vec3, envelope: CameraEnvelope): number {
  const offsetY = position[1] - target[1];
  const horizontal = Math.hypot(position[0], position[2]);
  const offsetHorizontal = Math.hypot(position[0] - target[0], position[2] - target[2]);
  let scale = 1;
  if (position[1] > envelope.maxHeight && offsetY > 0) {
    scale = Math.min(scale, (envelope.maxHeight - target[1]) / offsetY);
  }
  if (horizontal > envelope.maxHorizontalRadius && offsetHorizontal > 0) {
    const targetHorizontal = Math.hypot(target[0], target[2]);
    scale = Math.min(scale, Math.max(0, envelope.maxHorizontalRadius - targetHorizontal) / offsetHorizontal);
  }
  return Math.max(0, scale);
}
