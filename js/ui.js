import * as dat from 'dat.gui';

/**
 * @module ui
 */

/**
 * For now UI is handled by each module, so that structures dont need to be passed from each module to the UI module.
 * @function setupUI
 * @returns {dat.GUI} The dat.GUI instance.
*/
export function setupUI() {
    return new dat.GUI();
}