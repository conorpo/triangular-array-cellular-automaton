import * as dat from 'dat.gui';

import taeca from './taeca.js';

import { rule_info } from './shared_resources.js';
import { color_map } from './stages/render.js';

/**
 * @module ui
 */

/**
 * For now UI is handled by each module, so that structures dont need to be passed from each module to the UI module.
 * @function setupUI
 * @returns {dat.GUI} The dat.GUI instance.
*/
export function setupUI() {
    const gui = new dat.GUI({
        name: 'Cellular Automata'
    });

    gui.width = 200;

    //Rule Settings
    const rule_info_folder = gui.addFolder('Rule Info');
    rule_info_folder.open();

    function ui_rule_info_update_attempt() {
        if(taeca.attempt_rule_info_update()) {
            rule_info_folder.domElement.children[0].style.color = "";
            rule_info_folder.domElement.children[0].children[0].innerText = "Rule Info";
        } else {
            rule_info_folder.domElement.children[0].style.color = "red";
            rule_info_folder.domElement.children[0].children[0].innerText = "Rule Info (Buffer Size Too Large)";
        }
    }

    rule_info_folder.add(rule_info.local_resource, 'r', 1, 6, 1).name('r (range)').onFinishChange(ui_rule_info_update_attempt);
    rule_info_folder.add(rule_info.local_resource, 'k', 2, 6, 1).name('k (states)').onFinishChange(ui_rule_info_update_attempt);
    rule_info_folder.add(taeca, 'new_rule').name('New Rule');

    gui.mouseOverRuleInfo = false;

    rule_info_folder.domElement.addEventListener('mouseover', () => {
        gui.mouseOverRuleInfo = true;
    });

    rule_info_folder.domElement.addEventListener('mouseout', () => {
        gui.mouseOverRuleInfo = false;
    });


    const style_folder = gui.addFolder('Style');
    style_folder.open();

    for(let i = 0; i < parseInt(import.meta.env.TCA_MAX_STATES); i++) {
        style_folder.addColor(color_map.local_resource, `COLOR_${i}`).name(`State ${i}`).onChange(color_map.update);
    }

    return gui;
};
