import { initialize_random_shader_src } from "./initialize_ruleset.wgsl.js";

import device_info from "../device.js";

import { rule_info, ruleset } from "../shared_resources.js";

/**
 * @namespace Initialize
 * @description A namespace for the initialize stage.
*/

//#region Random Seeds Resource
const RANDOM_SEED_COUNT = parseInt(import.meta.env.TCA_INIT_KERNEL_SIZE);

/** 
 * @typedef {Object} RandomSeedsResourceContainer
 * @property {Uint32Array} local_resource The local random seeds array
 * @memberof Initialize
 */

/** 
 * @type {import("../types.js").ResourceContainer & RandomSeedsResourceContainer}
 */
export const random_seeds = {
    webgpu_resource: null,
    local_resource: new Uint32Array(RANDOM_SEED_COUNT * 4),
    create: function() {
        this.webgpu_resource = device_info.device.createBuffer({
            label: "Random Seed Buffer",
            size: RANDOM_SEED_COUNT * 4 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    },
    update: function() {
        for(let i = 0; i < RANDOM_SEED_COUNT; i++) {
            this.local_resource[i*4] = Math.floor(Math.random() * 4294967296);
            this.local_resource[i*4+1] = 0;
            this.local_resource[i*4+2] = 0;
            this.local_resource[i*4+3] = 0;
        }
        // @ts-ignore
        device_info.device.queue.writeBuffer(this.webgpu_resource, 0, this.local_resource);
        console.log(this.local_resource)
    },
}
//#endregion



//#region Random Seeds Bindgroup
/** 
 * @type {import("../types.js").BindgroupContainer} 
 */
export const random_seeds_bindgroup = {
    _bindgroup: null,
    layout: null,
    dirty: true,
    get bindgroup() {
        if(this.dirty) this.create_bindgroup();
        return this._bindgroup;
    },
    create_layout: function() {
        this.layout = device_info.device.createBindGroupLayout({
            label: "Initialize - Random Seeds Bindgroup Layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'uniform'
                    }
                }
            ]
        });
    },
    create_bindgroup: function() {
        this._bindgroup = device_info.device.createBindGroup({
            label: "Initialize - Random Seeds Bindgroup",
            layout: this.layout,
            // @ts-ignore
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: random_seeds.webgpu_resource
                    }
                }
            ]
        });
    }
}
//#endregion



//#region Rule Info Bindgroup
/** 
 * @type {import("../types.js").BindgroupContainer} 
 */
export const rule_info_bindgroup = {
    _bindgroup: null,
    layout: null,
    dirty: true,
    get bindgroup() {
        if(this.dirty) this.create_bindgroup();
        return this._bindgroup;
    },
    create_layout: function() {
        this.layout = device_info.device.createBindGroupLayout({
            label: "Initialize - Rule Bindgroup Layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'uniform'
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'storage'
                    }
                },
            ]
        });
    },
    create_bindgroup: function() {
        this._bindgroup = device_info.device.createBindGroup({
            label: "Initialize - Rule Bindgroup",
            layout: this.layout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: rule_info.webgpu_resource
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: ruleset.webgpu_resource
                    }
                }
            ]
        });
    }
}
//#endregion



//#region Initialize Pipeline
/** 
 * @type {import("../types.js").StageContainer} 
 */
export const stage = {
    shader: null,
    pipeline: null,
    layout: null,
    create_layout: function() {
        this.layout = device_info.device.createPipelineLayout({
            label: "Initialize Pipeline Layout",
            bindGroupLayouts: [rule_info_bindgroup.layout, random_seeds_bindgroup.layout]
        });
    },

    create: function() {
        this.shader = device_info.device.createShaderModule({
            label: "Initialize Shader Module",
            code: initialize_random_shader_src
        });

        this.pipeline = device_info.device.createComputePipeline({
            label: "Initialize Pipeline",
            layout: this.layout,
            compute: {
                module: this.shader,
                entryPoint: 'main'
            }
        });
    },
};
//#endregion

export default {
    random_seeds,
    rule_info_bindgroup,
    random_seeds_bindgroup,
    stage
}