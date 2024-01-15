
const common_sections = /* wgsl */`
struct RuleSettings {
    r: u32,
    k: u32
};

@group(0) @binding(0) var<uniform> rule_settings: RuleSettings;
@group(0) @binding(1) var<storage, read_write> ruleset: array<u32>;

`

export const initialize_random_shader_src = /* wgsl */`
${common_sections}

fn pcg(v : u32) -> u32 {
	let state = v * 747796405u + 2891336453u;
	let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
	return (word >> 22u) ^ word;
}

@group(1) @binding(0) var<uniform> rule_random_seed: array<u32, ${import.meta.env.TCA_INIT_KERNEL_SIZE}>;

@compute @workgroup_size(64) fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>
) {
    const ruleset_size = arrayLength(&ruleset);

    for(var i = (${import.meta.env.TCA_INIT_KERNEL_SIZE} * global_id.x); i < (${import.meta.env.TCA_INIT_KERNEL_SIZE} * (global_id.x + 1)); i++) {
        if(i >= ruleset_size) return;
        ruleset[i] = pcg(pcg(i)+rule_random_seed[i % ${import.meta.env.TCA_INIT_KERNEL_SIZE}]);
    }

}
`

// Will add other ruleset initialization methods later