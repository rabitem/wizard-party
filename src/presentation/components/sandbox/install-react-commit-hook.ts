import { isSandboxRoute } from '../../utils/sandbox-route';
import { installReactCommitHook } from './react-commit-hook';

/**
 * Side-effect module, imported first by the sandbox barrel: the hook must exist before
 * @react-three/fiber evaluates, because its reconciler registers with DevTools once, at module
 * load. react-dom loads with the app shell, earlier; only the Playwright fixture's init script
 * sees it. Installed on the sandbox route only.
 */
if (typeof window !== 'undefined' && isSandboxRoute()) installReactCommitHook(window);
