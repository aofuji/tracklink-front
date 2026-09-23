import { distanceInMeters } from './geo-distance';

describe('distanceInMeters', () => {
  it('calculates zero distance for the same point', () => {
    expect(distanceInMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 })).toBeCloseTo(0, 5);
  });

  it('calculates a distance at or above 10 meters', () => {
    const tenMetersInDegrees = 10 / 6371000 * 180 / Math.PI;

    expect(distanceInMeters({ latitude: 0, longitude: 0 }, { latitude: tenMetersInDegrees, longitude: 0 })).toBeCloseTo(10, 2);
  });
});
