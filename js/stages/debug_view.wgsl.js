import { rule_info_wgsl } from "./initialize_ruleset.wgsl.js"
import { view_info_wgsl } from "./render.wgsl.js";

/** @type {string} */
export const debug_view_shader_src = /* wgsl */`
${view_info_wgsl}

struct Vertex {
    @location(0) position: vec2<f32>,
    @builtin(vertex_index) index: u32
};

var<private> colors = array<vec4f, 2>(
    vec4<f32>(1.0, 0.0, 0.0, 1.0),
    vec4<f32>(0.0, 1.0, 0.0, 1.0)
);

struct FSInput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
};

@vertex fn vs(vert: Vertex) -> FSInput {
    var transformed_vert = (vert.position - view_info.origin) * view_info.zoom / view_info.canvas;
    transformed_vert = transformed_vert * 2.0 - 1.0;
    transformed_vert.y = -transformed_vert.y;    

    return FSInput(vec4f(transformed_vert,0.0,1.0), colors[vert.index/8u]);
}

@fragment fn fs(input: FSInput) -> @location(0) vec4f {
    return input.color;
}
`;