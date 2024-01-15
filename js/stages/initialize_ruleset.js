import { initialize_shader_src } from "./initialize_ruleset.wgsl.js";

import device_info from "../device.js";

import { rule_info } from "../shared_resources.js";

// Resources used only by the initialize stage
const RANDOM_SEED_COUNT = parseInt(import.meta.env.TCA_INIT_KERNEL_SIZE);

const random_seeds = {
    webgpu_resource: null,
    local_resource: new Uint32Array(RANDOM_SEED_COUNT),
    create: function() {
        this.webgpu_resource = device_info.device.createBuffer({
            label: "Random Seed Buffer",
            size: RANDOM_SEED_COUNT * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    },
    update: function() {
        for(let i = 0; i < RANDOM_SEED_COUNT; i++) {
            this.local_resource[i] = Math.floor(Math.random() * 4294967296);
        }

        device_info.queue.writeBuffer(this.webgpu_resource, 0, this.local_resource);
    }
}


export const initialize_stage = {}

initialize_stage.shader = device_info.device.createShaderModule({
    label: "Initialize Shader Module",
    code: initialize_shader_src
});

initialize_stage.rule_bindgroup_layout = device.createBindGroupLayout({
    label: "Initialize  - Rule Bindgroup Layout",
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

export const create_rule_bindgroup = (ruleset_buffer) => {
    initialize_stage.rule_bindgroup = device.createBindGroup({
        layout: initialize_stage.rule_bindgroup_layout,
        entries: [
            {
                binding: 0,
                resource: rule_info_buffer.webgpu_resource
            },
            {
                binding: 1,
                resource: {
                    buffer: ruleset_buffer
                }
            }
        ]
    });
}


initialize_stage.random_seeds_bindgroup_layout = device.createBindGroupLayout({
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

const initialize_pipeline_layout = device.createPipelineLayout({
    label: "Initialize Pipeline Layout",
    bindGroupLayouts: [initialize_stage.rule_bindgroup_layout, initialize_stage.random_seeds_bindgroup_layout]
});

initialize_stage.pipeline = device.createComputePipeline({
    label: "Initialize Pipeline",
    layout: initialize_pipeline_layoutpipeline_layout,
    compute: {
        module: initialize_stage.shader,
        entryPoint: 'main'
    }
});


