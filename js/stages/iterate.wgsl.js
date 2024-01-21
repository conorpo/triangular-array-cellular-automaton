import { rule_info_wgsl } from "./initialize_ruleset.wgsl.js"

export const iterate_shader_src = /* wgsl */`
${rule_info_wgsl}
@group(0) @binding(1) var<storage, read> ruleset: array<u32>;

struct IterateSettings {
    current_row: u32
};

@group(1) @binding(0) var input_texture: texture_2d<u32>;
@group(1) @binding(1) var<storage, read> input_iterate_settings: IterateSettings;
@group(1) @binding(2) var output_texture: texture_storage_2d<r32uint, write>;
@group(1) @binding(3) var<storage, read_write> output_iterate_settings: IterateSettings;

@compute @workgroup_size(64) fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>
) {
    let texture_width = textureDimensions(input_texture).x;

    let row = input_iterate_settings.current_row;
    let col = global_id.x;

    // Copy the current row to the output texture
    textureStore(output_texture, vec2u(col, row), textureLoad(input_texture, vec2u(col, row), 0));

    let offset = select(0, 1, (row) % 2u == 1u);
    // Odd rows are offset by 1 to the left

    var rule_index = 0u;
    // Example: if r = 1, and current row (row we are checking, first step of iterate) is even then we check 0, 1
    // If the row is odd then we check -1, 0
    for(var i = -i32(rule_settings.r); i < i32(rule_settings.r); i++) {
        rule_index *= rule_settings.k;
        let col_to_load = u32(i32(col) + i + offset + i32(texture_width)) % texture_width; 
        
        rule_index += textureLoad(input_texture, vec2u(col_to_load, row), 0).r;
    }

    let state = ruleset[rule_index];
    textureStore(output_texture, vec2u(col, row+1), vec4u(state,0,0,0));

    if(col == 0) {
        output_iterate_settings.current_row = row+1;
    }
}
`
