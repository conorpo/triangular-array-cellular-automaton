export const iterate_shader_src = /* wgsl */`
struct RuleInfo {
    k: u32;
    r: u32;
    rule: array<u32>;
}

@group(0) @binding(0) var<uniform> rule_info: RuleInfo;
@group(0) @binding(1) var<storage, read> ruleset: array<u32>;

@group(1) @binding(0) var input_texture: texture_storage_2d<r32uint, read>;
@group(1) @binding(1) var output_texture: texture_storage_2d<r32uint, write>;

@compute @workgroup_size(64) fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>
) {

}
`
