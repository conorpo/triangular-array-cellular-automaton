/**
 * @typedef {Object} DeviceInfo
 * @property {GPUDevice} device The webgpu device
 * @property {GPUAdapter} adapter The webgpu adapter
 * @property {GPUTextureFormat} presentation_format The presentation format
 * @property {function} initWebGPU Initializes the webgpu device
*/

/**
 * @type {DeviceInfo}
 */
export default {
    device: null,
    adapter: null,
    presentation_format: null,
    initWebGPU: async function() {
        this.adapter = await navigator.gpu?.requestAdapter();
        this.presentation_format = navigator.gpu?.getPreferredCanvasFormat();
        this.device = (import.meta.env.TCA_TIMESTAMPS === "true") ? await this.adapter?.requestDevice({ // Debugging
            requiredFeatures: ['timestamp-query']
        }) : await this.adapter?.requestDevice(); // Production
    }
};