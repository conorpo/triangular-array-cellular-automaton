export const render_shader_src = /* wgsl */`

struct ViewInfo {
    origin_x: f32,
    origin_y: f32,
    zoom: f32, // 1.0 = 1 pixel per cell
}


@group(0) @binding(0) var<uniform> view_info: ViewInfo;

@group(1) @binding(0) var ca_texture: texture_2d<u32>;
//@group(1) @binding(1) var<uniform> color_map: array<vec4f>;

var<private> color_map : array<vec4f, 6> = array<vec4f, 6>(
    vec4<f32>(0.145,0.141,0.133,1.0), // Eerie black
    vec4<f32>(0.921,0.368,0.156,1.0), // Flame
    vec4<f32>(1,0.988,0.949,1.0), // Floral white
    vec4<f32>(0.439,0.635,0.533,1.0), // Cambridge blue
    vec4<f32>(0.8,0.772,0.725,1.0), // Timberwolf
    vec4<f32>(0.250,0.239,0.223,1.0), // Black olive
);

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
    let row = u32(uv.y / view_info.zoom + view_info.origin_y);
    let col_notoffset = uv.x / view_info.zoom + view_info.origin_x;
    let col = u32(select(col_notoffset, col_notoffset + 0.5, row % 2u == 1u));    

    let state = textureLoad(ca_texture, vec2u(col,row), 0);

    // Implement color mapping here
    return color_map[state.r];
}
`