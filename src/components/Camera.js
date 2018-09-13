import { mat4, project, unproject } from '../util';

export default function Camera () {
  const projection = [];
  const view = [];
  const projView = [];
  const viewport = [ 0, 0, 1, 1 ];
  const invProjView = [];
  const up = [ 0, -1, 0 ];
  const near = 0.001;
  const far = 100;

  return {
    eye: [ 0, 4, 4 ],
    target: [ 0, 0, 0 ],
    set (width, height) {
      const aspect = width / height;
      viewport[2] = width;
      viewport[3] = height;

      // Compute camera perspective
      mat4._MIN_perspective(projection, Math.PI / 4, aspect, near, far);

      // Compute view matrix
      mat4._MIN_lookAt(view, this.eye, this.target, up);

      // compute combined
      mat4._MIN_multiply(projView, projection, view);

      // invert it for ray picking
      mat4._MIN_invert(invProjView, projView);
    },
    unproject (vector, out = []) {
      return unproject(out, vector, viewport, invProjView);
    },
    project (vector, out = []) {
      return project(out, vector, viewport, projView);
    }
  };
}
