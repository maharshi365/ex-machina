import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import { validateEnv } from './lib/env/server';

// Fail fast: validate env once at server boot so misconfiguration surfaces
// here with a clear message instead of as cryptic per-request errors.
validateEnv();

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request);
  },
});
