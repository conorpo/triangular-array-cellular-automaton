export const iterate_shader_src = /* wgsl */`
struct RuleSettings {
    r: u32,
    k: u32
};

struct IterateSettings {
    current_row: atomic<u32>
};

@group(0) @binding(0) var<storage, read_write> iterate_settings: IterateSettings;
@group(0) @binding(1) var<uniform> rule_settings: RuleSettings;
@group(0) @binding(2) var<storage, read> ruleset: array<u32>;

@group(1) @binding(0) var input_texture: texture_2d<u32>;
@group(1) @binding(1) var output_texture: texture_storage_2d<r32uint, write>;

@compute @workgroup_size(64) fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>
) {
    let row = atomicLoad(&iterate_settings.current_row);
    let col = global_id.x;

    // Copy the current row to the output texture
    textureStore(output_texture, vec2u(col, row), textureLoad(input_texture, vec2u(col, row), 0));

    let offset = select(0, 1, (row) % 2u == 1u);
    // Odd rows are offset by 1 to the left

    var rule_index = 0u;
    // Example: if r = 2, and row is odd then we check -2, -1, 0, 1
    // If the row is even then we want to check -1, 0, 1, 2
    for(var i = -i32(rule_settings.r); i < i32(rule_settings.r); i++) {
        rule_index *= rule_settings.k;
        rule_index += textureLoad(input_texture, vec2u(u32(i32(col) + i + offset), row), 0).r;
    }

    let state = ruleset[rule_index];
    textureStore(output_texture, vec2u(col, row+1), vec4u(state,0,0,0));

    storageBarrier();
    atomicStore(&iterate_settings.current_row, row+1);
}
`
