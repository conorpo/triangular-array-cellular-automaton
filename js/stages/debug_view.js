import device_info from "../device.js";
import { debug_view_shader_src } from "./debug_view.wgsl.js";

import { view_info_bindgroup, rule_info} from "../shared_resources.js";

//#region Rule Info Bindgroup

/**
 * @type {import('../types.js').BindgroupContainer}
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
            label: "Debug View - Rule Info Bindgroup Layout",
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
            layout: this.layout,
            // @ts-ignore
            entries: [
                {
                    binding: 0,
                    resource: rule_info.webgpu_resource
                }
            ]
        });
        this.dirty = false;
    }
};
//#endregion

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
                view_info_bindgroup.layout,
                rule_info_bindgroup.layout
            ]
        });
    },
    create: function() {
        this.shader = device_info.device.createShaderModule({
            label: "Debug View - Shader Module",
            code: debug_view_shader_src
        });

        this.pipeline = device_info.device.createComputePipeline({
            label: "Debug View - Pipeline",
            layout: this.layout,
            compute: {
                module: this.shader,
                entryPoint: "main"
            }
        });
    }
}

export default {
    rule_info_bindgroup,
    stage
}