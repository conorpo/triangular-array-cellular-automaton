
export const rule_info_wgsl = /* wgsl */`
struct RuleInfo {
    r: u32,
    k: u32
};
@group(0) @binding(0) var<uniform> rule_settings: RuleInfo;
`

export const initialize_random_shader_src = /* wgsl */`
${rule_info_wgsl}
@group(0) @binding(1) var<storage, read_write> ruleset: array<u32>;

fn pcg(v : u32) -> u32 {
	let state = v * 747796405u + 2891336453u;
	let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
	return (word >> 22u) ^ word;
}

struct RandomSeed {
    @size(16) seed: u32,
}
@group(1) @binding(0) var<uniform> rule_random_seed: array<RandomSeed, ${import.meta.env.TCA_INIT_KERNEL_SIZE}>;

@compute @workgroup_size(64) fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>
) {
    let ruleset_size = arrayLength(&ruleset);

    var running_hash = 0u;

    for(var i = (${import.meta.env.TCA_INIT_KERNEL_SIZE} * global_id.x); i < (${import.meta.env.TCA_INIT_KERNEL_SIZE} * (global_id.x + 1)); i++) {
        if(i >= ruleset_size) { return; }

        running_hash ^= pcg(i + rule_random_seed[i % ${import.meta.env.TCA_INIT_KERNEL_SIZE}].seed);

        ruleset[i] = running_hash % rule_settings.k;
    }

}
`

// Will add other ruleset initialization methods later