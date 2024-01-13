import { setupUI } from './ui.js';

import { setupSharedResources } from './shared_resources.js';
import { setupIterateStage } from './stages/iterate.js';
import { setupRenderStage } from './stages/render.js';


import Stats from 'stats.js';

async function init() {
  const { adapter, device, presentation_format } = await initWebGPU();

  const canvas = document.getElementById('webgpu_canvas');
  canvas.style.imageRendering = 'pixelated';
  const context = canvas.getContext('webgpu');
  if (!context) throw ReferenceError('WebGPU not supported');
  context.configure({
    device,
    format: presentation_format
  });

  // Initialze UI prior to populating resources
  const gui = await setupUI();

  // Setup Resources and Stages
  const shared_resources = await setupSharedResources(device, gui);
  //const mouse_info = await setupMouse();

  //const rule_generator_stage = await setupRuleGenerator(device, shared_resources);
  //const iterate_stage = await setupIterateStage(device, shared_resources);
  const render_stage = await setupRenderStage(device, shared_resources, presentation_format);

  // Perf 
  const stats = new Stats();
  stats.dom.classList.add('taeca-stats');
  document.body.appendChild(stats.dom);

  /**
   * Check if the canvas has been resized, re-create the depth texture if so.
   * @function resizeIfNeeded
   * @returns {boolean} True if the resizing was needed, false otherwise.
  */
  function resizeIfNeeded() {
    const width = Math.max(1, Math.min(device.limits.maxTextureDimension2D, canvas.clientWidth));
    const height = Math.max(1, Math.min(device.limits.maxTextureDimension2D, canvas.clientHeight));

    if (canvas.width === width && canvas.height === height) return false;
    canvas.width = width;
    canvas.height = height;

    console.log(`Resized canvas to ${width}x${height}`);
    
    // I don't think we need a depth texture
    //renderingStage.createDepthTexture(); 

    return true;
  }

  let lastTime = 0;
  async function render(time) {
    const delta = time - lastTime;
    lastTime = time;
    stats.begin();

    // Check for window resize, re create depth texture if so
    resizeIfNeeded();


    const encoder = device.createCommandEncoder({label: 'Frame Command Encoder'});
    //const compute_pass = encoder.beginComputePass({label: 'Iterate Pass'});

    // Setup Rule

    // Iterate Until Done
    //compute_pass.setPipeline(iterate_stage.pipeline);
    // for(let i = 0; i < 500; i++) {
    //   compute_pass.setBindGroup(0, iterate_stage.bindgroups[i % 2]);
    //   compute_pass.setBindGroup(1, iterate_stage.bindgroups[i % 2]);
    //   compute_pass.dispatchWorkgroups(500, 1, 1);
    // }

    // Render
    render_stage.render_pass_descriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    const render_pass = encoder.beginRenderPass(render_stage.render_pass_descriptor);

    render_pass.setPipeline(render_stage.render_pipeline);
    render_pass.setBindGroup(0, render_stage.bindgroup);
    render_pass.draw(6);

    render_pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    stats.end();

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

async function initWebGPU() {
  const adapter = await navigator.gpu?.requestAdapter();
  const presentation_format = navigator.gpu?.getPreferredCanvasFormat();
  const device = await adapter.requestDevice();
  console.log(presentation_format)

  return {
    adapter,
    presentation_format,
    device
  };
}

// Entry point
try {
  await init();
} catch (e) {
  console.error(e);
  alert(e);
}

