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