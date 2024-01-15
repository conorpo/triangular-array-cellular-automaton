import { ruleset, rule_info, ca_textures } from '../shared_resources.js';
import { iterate_shader_src } from './iterate.wgsl.js';
import device_info from '../device.js';

/**
 * @module iterate
*/


// Resources used only by the iterate stage
const iterate_settings_buffer_descriptor = device_info.device.createBuffer({
    label: "Iterate Settings Buffer",
    size: 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
});


export const iterate_settings = {
    webgpu_resource: Array(parseInt(import.meta.env.TCA_TEXTURE_COUNT)).fill().map(() => { return device_info.device.createBuffer(iterate_settings_buffer_descriptor); }),
    local_resource: { current_row: 0 },
    update: function() {
        device_info.device.queue.writeBuffer(
            this.webgpu_resource[0],
            0,
            new Uint32Array([this.local_resource.current_row])
        );
    },
    reset: function() {
        this.local_resource.current_row = 0;
        this.update();
    }
};

export const iterate_stage = {};

iterate_stage.shader = device_info.device.createShaderModule({
    label: "Iterate Shader Module",
    code: iterate_shader_src
});

iterate_stage.rule_bindgroup_layout = device_info.device.createBindGroupLayout({
    label: "Rule Bindgroup Layout",
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

export function create_iterate_bindgroup() {
    iterate_stage.iterate_bindgroup = device_info.device.createBindGroup({
        layout: iterate_stage.rule_bindgroup_layout,
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
};

iterate_stage.pingpong_bindgroup_layout = device_info.device.createBindGroupLayout({
    label: "Pingpong Bindgroup Layout",
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

const n = parseInt(import.meta.env.TCA_TEXTURE_COUNT);
iterate_stage.pingpong_bindgroups = [];
for(let i = 0; i < n; i++) {
    iterate_stage.pingpong_bindgroups.push(device_info.device.createBindGroup({
        layout: iterate_stage.pingpong_bindgroup_layout,
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
                resource: ca_textures.webgpu_resource[(i + 1) % n].createView()
            },
            {
                binding: 3,
                resource: {
                    buffer: iterate_settings.webgpu_resource[(i + 1) % n]
                }
            }
        ]
    }));
}

const iterate_pipeline_layout = device_info.device.createPipelineLayout({
    label: "Iterate Pipeline Layout",
    bindGroupLayouts: [
        iterate_stage.rule_bindgroup_layout,
        iterate_stage.pingpong_bindgroup_layout
    ]
});

iterate_stage.iterate_pipeline = device_info.device.createComputePipeline({
    layout: iterate_pipeline_layout,
    compute: {
        module: iterate_stage.shader,
        entryPoint: "main"
    }
});
