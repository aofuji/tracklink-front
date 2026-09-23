import { routes } from './app.routes';

describe('routes', () => {
  it('keeps tracking/new before the public tracking token route', () => {
    const newIndex = routes.findIndex((route) => route.path === 'tracking/new');
    const publicIndex = routes.findIndex((route) => route.path === 'tracking/:token');

    expect(newIndex).toBeGreaterThanOrEqual(0);
    expect(publicIndex).toBeGreaterThanOrEqual(0);
    expect(newIndex).toBeLessThan(publicIndex);
    expect(routes[publicIndex].canActivate).toBeUndefined();
  });
});
