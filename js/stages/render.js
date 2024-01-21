import { render_shader_src } from "./render.wgsl.js";

import { view_info_bindgroup, ca_textures } from "../shared_resources.js";

import device_info from "../device.js";




//#region Render Texture Resource
/**
 * @type {import("../types.js").ResourceContainer}
*/
export const render_texture = {
    webgpu_resource: null,
    create: function(width, height) {
        if(import.meta.env.DEV) console.log("Creating Render Texture with multisample count: " + parseInt(import.meta.env.TCA_SAMPLE_COUNT));
        this.webgpu_resource = device_info.device.createTexture({
            label: "Render Texture",
            size: [width, height],
            sampleCount: parseInt(import.meta.env.TCA_SAMPLE_COUNT),
            format: device_info.presentation_format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });

        stage.render_pass_descriptor.colorAttachments[0].view = this.webgpu_resource.createView();
    }
}
//#endregion



//#region Color Map Resource
/**
 * @typedef {Object} ColorMapResourceContainer
 * @property {Object} local_resource The local color map buffer
 */

/**
 * @type {import("../types.js").ResourceContainer & ColorMapResourceContainer}
 */

export const color_map = {
    webgpu_resource: null,
    local_resource: null,
    create: function() {
        this.local_resource = {};
        for(let i = 0; i < parseInt(import.meta.env.TCA_MAX_STATES); i++) {
            this.local_resource[`COLOR_${i}`] = import.meta.env[`TCA_INITIAL_COLOR_${i}`].split(',').map((x) => { return parseInt(x); });
        }

        this.webgpu_resource = device_info.device.createBuffer({
            label: "Color Map Buffer",
            size: (4 * Float32Array.BYTES_PER_ELEMENT) * parseInt(import.meta.env.TCA_MAX_STATES),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        texture_bindgroup.dirty = true;
    },
    update: function() {
        const new_colors = new Float32Array(4 * parseInt(import.meta.env.TCA_MAX_STATES));
        console.log(color_map.local_resource)

        for(let i = 0; i < parseInt(import.meta.env.TCA_MAX_STATES); i++) {
            const color = color_map.local_resource[`COLOR_${i}`];
            new_colors[i*4] = color[0] / 255;
            new_colors[i*4+1] = color[1] / 255;
            new_colors[i*4+2] = color[2] / 255;
            new_colors[i*4+3] = color[3];
        }

        if(import.meta.env.DEV) console.log("New Colors: ", new_colors);

        device_info.device.queue.writeBuffer(color_map.webgpu_resource, 0, new_colors);
    }
}

//#region CA Texture & Color Bindgroup
/**
 * @type {import("../types.js").BindgroupContainer}
*/
export const texture_bindgroup = {
    _bindgroup: null,
    layout: null,
    dirty: true,
    get bindgroup() {
        if(this.dirty) this.create_bindgroup();
        return this._bindgroup;
    },
    create_layout: function() {
        this.layout = device_info.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "uint",
                        viewDimension: "2d",
                        multisampled: false
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "uniform"
                    }
                }
            ]
        });
    },
    create_bindgroup: function() {
        this._bindgroup = device_info.device.createBindGroup({
            layout: this.layout,
            entries: [
                {
                    binding: 0,
                    resource: ca_textures.webgpu_resource[0].createView()
                },
                {
                    binding: 1,
                    resource: {
                        buffer: color_map.webgpu_resource
                    }
                }
            ]
        });
        this.dirty = false;
    }
}
//#endregion





//#region Render Pipeline
/**
 * @typedef {Object} RenderStageContainer
 * @property {GPURenderPassDescriptor} render_pass_descriptor
 */

/**
 * @type {import("../types.js").StageContainer & RenderStageContainer}
 */
export const stage = {
    shader: null,
    pipeline: null,
    layout: null,
    render_pass_descriptor: {
        colorAttachments: [
            {
                view: null, // Assigned by render texture creation
                resolveTarget: undefined, // Assigned later in render loop
                clearValue: { r: 0.5, g: 0.0, b: 0.0, a: 1.0},
                loadOp: 'clear',
                storeOp: (parseInt(import.meta.env.TCA_SAMPLE_COUNT) > 1) ? 'discard' : 'store'
            }
        ]
    },
    create_layout: function() {
        this.layout = device_info.device.createPipelineLayout({
            bindGroupLayouts: [view_info_bindgroup.layout, texture_bindgroup.layout]
        });
    },
    create: function() {
        this.shader = device_info.device.createShaderModule({
            code: render_shader_src
        });

        this.pipeline = device_info.device.createRenderPipeline({
            label: "Main Render Pipeline",
            layout: this.layout,
            vertex: {
                module: this.shader,
                entryPoint: 'vs',
            },
            fragment: {
                module: this.shader,
                entryPoint: 'fs',
                targets: [
                    {
                        format: device_info.presentation_format
                    }
                ]
            },
            primitive: {
                topology: 'triangle-list'
            },
            multisample: {
                count: parseInt(import.meta.env.TCA_SAMPLE_COUNT)
            }
        });
    },
}
//#endregion

export default {
    color_map,
    texture_bindgroup,
    stage,
    render_texture
}