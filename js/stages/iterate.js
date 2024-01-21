import { ruleset, rule_info, ca_textures } from '../shared_resources.js';
import { iterate_shader_src } from './iterate.wgsl.js';
import device_info from '../device.js';

/**
 * @module iterate
*/

/**
 * @namespace Iterate
 * @description A namespace for the iterate stage.
*/

//#region Iterate Settings Resource
/**
 * @type {GPUBufferDescriptor}
 */
const iterate_settings_buffer_descriptor = {
    label: "Iterate Settings Buffer",
    size: 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
};

/**
 * @typedef {Object} IterateSettings
 * @property {number} current_row The current row of the CA
*/

/**
 * @typedef {Object} IterateSettingsResourceContainer
 * @property {IterateSettings} local_resource The local iterate settings buffer
 */

/** 
 * @type {import("../types.js").ResourceContainer & IterateSettingsResourceContainer} 
*/
export const iterate_settings = {
    webgpu_resource: null,
    local_resource: null,
    create: function() {
        this.webgpu_resource = Array(parseInt(import.meta.env.TCA_TEXTURE_COUNT)).fill().map(() => { return device_info.device.createBuffer(iterate_settings_buffer_descriptor); })
        /** @type {IterateSettings} */
        this.local_resource = {
            current_row: 0,
        }

        pingpong_bindgroups.dirty = true;
    },
    update: function() {
        device_info.device.queue.writeBuffer(
            this.webgpu_resource[0],
            0,
            new Uint32Array([this.local_resource.current_row])
        );
    }
};
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
            label: "Iterate - Rule Info Bindgroup Layout",
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
                        type: 'read-only-storage'
                    }
                },
            ]
        });
    },
    create_bindgroup: function() {
        this._bindgroup = device_info.device.createBindGroup({
            layout: this.layout,
            // @ts-ignore
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
        this.dirty = false;
    }
};
//#endregion



//#region Pingpong Bindgroups
/** 
 *@type {import("../types.js").BindgroupContainer}
 */
export const pingpong_bindgroups = {
    _bindgroup: null,
    layout: null,
    dirty: true,
    get bindgroup() {
        if(this.dirty) this.create_bindgroup();
        return this._bindgroup;
    },
    create_layout: function() {
        this.layout = device_info.device.createBindGroupLayout({
            label: "Iterate - Pingpong Bindgroup Layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {
                        sampleType: "uint",
                        viewDimension: "2d"
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'read-only-storage'
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: 'write-only',
                        format: 'r32uint',
                        viewDimension: '2d'
                    }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'storage'
                    }
                }
            ]
        });
    },
    create_bindgroup: function() {
        this._bindgroup = Array(parseInt(import.meta.env.TCA_TEXTURE_COUNT)).fill().map((_, i) => {
            return device_info.device.createBindGroup({
                layout: this.layout,
                entries: [
                    {
                        binding: 0,
                        resource: ca_textures.webgpu_resource[i].createView()
                    },
                    {
                        binding: 1,
                        resource: {
                            buffer: iterate_settings.webgpu_resource[i]
                        }
                    },
                    {
                        binding: 2,
                        resource: ca_textures.webgpu_resource[(i + 1) % parseInt(import.meta.env.TCA_TEXTURE_COUNT)].createView()
                    },
                    {
                        binding: 3,
                        resource: {
                            buffer: iterate_settings.webgpu_resource[(i + 1) % parseInt(import.meta.env.TCA_TEXTURE_COUNT)]
                        }
                    }
                ]
            });
        });
        this.dirty = false;
    }
}
//#endregion



//#region Iterate Pipeline
/** @type {import("../types.js").StageContainer}*/
export const stage = {
    shader: null,
    layout: null,
    pipeline: null,
    create_layout: function() {
        this.layout = device_info.device.createPipelineLayout({
            label: "Iterate Pipeline Layout",
            bindGroupLayouts: [
                rule_info_bindgroup.layout,
                pingpong_bindgroups.layout
            ]
        });
    },
    create: function() {
        this.shader = device_info.device.createShaderModule({
            label: "Iterate Shader Module",
            code: iterate_shader_src
        });

        this.pipeline = device_info.device.createComputePipeline({
            layout: this.layout,
            compute: {
                module: this.shader,
                entryPoint: "main"
            }
        });
    }
}
//#endregion

export default {
    iterate_settings,
    rule_info_bindgroup,
    pingpong_bindgroups,
    stage
}