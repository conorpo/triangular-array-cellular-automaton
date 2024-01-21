import device_info from "../device.js";
import { debug_view_shader_src } from "./debug_view.wgsl.js";

import { view_info_bindgroup } from "../shared_resources.js";

//#region Vertex Buffer
/**
 * @typedef {Object} VertexBufferResourceContainer
 * @property {Float32Array} local_resource The local vertex buffer array
*/

/**
 * @type {import('../types.js').ResourceContainer & VertexBufferResourceContainer}
 */
export const vertex_buffer = {
    webgpu_resource: null,
    local_resource: null,
    create: function() {
        this.local_resource = new Float32Array(2 * 16);

        this.webgpu_resource = device_info.device.createBuffer({
            label: "Debug View - Vertex Buffer",
            size: (2 * Float32Array.BYTES_PER_ELEMENT) * 16,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
    },
    update: function(range) {
        const top_edge_y = 0;
        const bottom_edge_y = 1;
        const left_edge_x = parseInt(import.meta.env.TCA_TEXTURE_WIDTH) / 2 - range;
        const right_edge_x = parseInt(import.meta.env.TCA_TEXTURE_WIDTH) / 2 + range;
        const middle_x = parseInt(import.meta.env.TCA_TEXTURE_WIDTH) / 2;

        this.local_resource.set([
            left_edge_x, top_edge_y,
            left_edge_x, bottom_edge_y,
            left_edge_x, bottom_edge_y,
            right_edge_x, bottom_edge_y,
            right_edge_x, bottom_edge_y,
            right_edge_x, top_edge_y,
            right_edge_x, top_edge_y,
            left_edge_x, top_edge_y, // Range Vis
            middle_x - 0.5, 1,
            middle_x - 0.5, 2,
            middle_x - 0.5, 2,
            middle_x + 0.5, 2,
            middle_x + 0.5, 2,
            middle_x + 0.5, 1,
            middle_x + 0.5, 1,
            middle_x - 0.5, 1, // Cursor Vis
        ])

        console.log(`Debug Vertex Buffer ${this.local_resource}`);
        device_info.device.queue.writeBuffer(this.webgpu_resource, 0, this.local_resource);
    }
}


//#region Debug View Stage
/**
 * @type {import('../types.js').StageContainer}
 */
const stage = {
    shader: null,
    layout: null,
    pipeline: null,
    create_layout: function() {
        this.layout = device_info.device.createPipelineLayout({
            label: "Debug View - Pipeline Layout",
            bindGroupLayouts: [
                view_info_bindgroup.layout
            ]
        });
    },
    create: function() {
        this.shader = device_info.device.createShaderModule({
            label: "Debug View - Shader Module",
            code: debug_view_shader_src
        });

        this.pipeline = device_info.device.createRenderPipeline({
            label: "Debug View - Render Pipeline",
            layout: this.layout,
            vertex: {
                module: this.shader,
                entryPoint: "vs",
                buffers: [
                    {
                        arrayStride: 4 * 2,
                        attributes: [
                            {
                                shaderLocation: 0,
                                offset: 0,
                                format: "float32x2"
                            }
                        ]
                    }
                ]
            },
            fragment: {
                module: this.shader,
                entryPoint: "fs",
                targets: [
                    {
                        format: device_info.presentation_format
                    }
                ]
            },
            primitive: {
                topology: "line-list"
            }
        });
    }
}

export default {
    vertex_buffer,
    stage
}