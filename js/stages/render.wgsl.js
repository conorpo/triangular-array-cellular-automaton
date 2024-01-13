export const render_shader_src = /* wgsl */`
@group(0) @binding(0) var ca_texture: texture_2d<u32>;

const quad_verts = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, 1.0),
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(1.0, -1.0),
    vec2<f32>(1.0, -1.0),
    vec2<f32>(1.0, 1.0),
    vec2<f32>(-1.0, 1.0)
);

@vertex fn vs(@builtin(vertex_index) index : u32) -> @builtin(position) vec4f {
    let pos = vec4<f32>(quad_verts[index], 0.0, 1.0);
    return pos;
}

@fragment fn fs(@builtin(position) uv: vec4f) -> @location(0) vec4f {
    //let dims = vec2f(textureDimensions(ca_texture).xy);
    let row = u32(uv.y) / 4;
    let col = select(u32(uv.x / 4), u32(uv.x / 4 + 0.5), row % 2u == 1u);    

    let state = textureLoad(ca_texture, vec2u(col,row), 0);

    // Implement color mapping here
    if(state.r == 0u) {
        return vec4<f32>(1.0, 1.0, 1.0, 1.0);
    } else {
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }
}
`