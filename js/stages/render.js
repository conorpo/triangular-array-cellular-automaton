import { render_shader_src } from "./render.wgsl.js";

export function setupRenderStage(device, shared_resources, presentation_format) {
    const render_stage = {};

    render_stage.shader = device.createShaderModule({
        label: "Render Shader Module",
        code: render_shader_src
    });

    render_stage.bindgroup_layout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: "uint",
                    viewDimension: "2d",
                    multisampled: false
                }
            }
        ]
    });

    // For now we will make sure the ping-pong always ends on the first texture
    render_stage.bindgroup = device.createBindGroup({
        layout: render_stage.bindgroup_layout,
        entries: [
            {
                binding: 0,
                resource: shared_resources.ca_textures[0].createView()
            }
        ]
    });

    render_stage.pipeline_layout = device.createPipelineLayout({
        bindGroupLayouts: [render_stage.bindgroup_layout]
    });

    /**
     * @type {GPURenderPassDescriptor}
    */
    render_stage.render_pass_descriptor = {
        colorAttachments: [
            {
                view: undefined, // Assigned later
                clearValue: { r: 0.5, g: 0.0, b: 0.0, a: 1.0},
                loadOp: 'clear',
                storeOp: 'store'
            }
        ]
    };

    render_stage.render_pipeline = device.createRenderPipeline({
        layout: render_stage.pipeline_layout,
        vertex: {
            module: render_stage.shader,
            entryPoint: 'vs',
        },
        fragment: {
            module: render_stage.shader,
            entryPoint: 'fs',
            targets: [
                {
                    format: presentation_format
                }
            ]
        },
        primitive: {
            topology: 'triangle-list'
        },
    });

    return render_stage;
}