import device_info from './device.js';
import { begin_render_loop } from './taeca.js'

import { ca_textures, read_mapped_ruleset, rule_info, ruleset, view_info, view_info_bindgroup } from './shared_resources.js';

import initialize from './stages/initialize_ruleset.js';
import iterate from './stages/iterate.js';
import render from './stages/render.js';
import debug_view from './stages/debug_view.js';

import Stats from 'stats.js';
import { setupUI } from './ui.js';
import { mouse }  from './mouse.js';

async function init() {
  await device_info.initWebGPU();

  /** @type {HTMLCanvasElement}  */
  // @ts-ignore
  const canvas = document.getElementById('webgpu_canvas');
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const context = canvas.getContext('webgpu');
  if (!context) throw ReferenceError('WebGPU not supported');
  context.configure({
    device: device_info.device,
    format: device_info.presentation_format,
    alphaMode: (import.meta.env.TCA_SAMPLE_COUNT > 1) ? 'opaque' : 'premultiplied',
  })

  //#region Setup Shared Resources and Bindgroups
  ca_textures.create(); // The pingpong textures that store our CA Grid
  rule_info.create(); // Metadata about the rule (range, state count)

  ruleset.create(rule_info.local_resource.size); // The rule is stored here
  read_mapped_ruleset.create(rule_info.local_resource.size); // A version of the rule buffer used for reading

  view_info.create(canvas); // Data about the view (zoom, origin, canvas size)

  view_info_bindgroup.create_layout(); 
  //#endregion

  //#region Setup Initialize Stage (Resources, Bindgroups, Pipeline)
  initialize.random_seeds.create(); // The random seeds used to generate a random rule (I'm sorry you had to find out like this...)

  initialize.rule_info_bindgroup.create_layout(); // Bindgroup 0 
  initialize.random_seeds_bindgroup.create_layout(); // Bindgroup 1

  initialize.stage.create_layout();
  initialize.stage.create();
  //#endregion

  //#region Setup Iterate Stage
  iterate.iterate_settings.create();

  iterate.rule_info_bindgroup.create_layout(); // Bindgroup 0
  iterate.pingpong_bindgroups.create_layout(); // Bindgroup 1

  iterate.stage.create_layout();
  iterate.stage.create();
  //#endregion

  //#region Setup Render Stage
  if(parseInt(import.meta.env.TCA_SAMPLE_COUNT) > 1) { render.render_texture.create(canvas.width, canvas.height); }
  render.color_map.create();

  // Shared Resource:  view_info_bindgroup  // Bindgroup 0
  render.texture_bindgroup.create_layout(); // Bindgroup 1

  render.stage.create_layout();  
  render.stage.create();
  //#endregionhttps://www.youtube.com/watch?v=yXa2pvhlplM&t=43s

  //#region Setup Debug View Stage
  // Shared Resource:  view_info_bindgroup  // Bindgroup 0
  debug_view.vertex_buffer.create();

  debug_view.stage.create_layout();
  debug_view.stage.create();
  //#endregion
  
  //Setup GUI
  const gui = await setupUI();

  // Setup Mouse
  mouse.setupListeners(canvas);
  mouse.calcMinZoom(canvas.width);

  // Perf 
  const stats = new Stats();
  stats.dom.classList.add('taeca-stats');
  document.body.appendChild(stats.dom);
  
  begin_render_loop(context, stats, gui);
}


// Entry point
try {
  init();
} catch (e) {
  console.error(e);
  alert(e);
}

