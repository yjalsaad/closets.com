import * as THREE from 'three';
import { buildFacade } from './facade';
import { buildLandscape } from './landscape';
import { createSkyDome } from '../../3d/sky';

export function buildExterior(ctx) {
  const group = new THREE.Group(); group.name = 'exterior';
  const facade = buildFacade(ctx); group.add(facade.group, buildLandscape(ctx).group, createSkyDome(ctx.tier.clouds));
  return { group, relabel: facade.relabel };
}
