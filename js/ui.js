import * as dat from 'dat.gui';

import taeca from './taeca.js';

import { rule_info } from './shared_resources.js';

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

    //GUI Settings
    const rule_info_folder = gui.addFolder('Rule Info');
    rule_info_folder.open();
    rule_info_folder.add(rule_info.local_resource, 'r', 1, 6, 1).name('r (range)').onFinishChange(() => {
        unguaranteed_ui_update(taeca.attempt_rule_info_update, rule_info_folder.domElement.children[0])
    });
    rule_info_folder.add(rule_info.local_resource, 'k', 2, 6, 1).name('k (states)').onFinishChange(() => {
        unguaranteed_ui_update(taeca.attempt_rule_info_update, rule_info_folder.domElement.children[0])
    });
    rule_info_folder.add(taeca, 'new_rule').name('New Rule');

    function unguaranteed_ui_update(update_func, element) {
        if(update_func()) {
            element.style.color = "";
            element.children[0].innerText = "Rule Info";
        } else {
            element.style.color = "red";
            element.children[0].innerText = "Rule Info (Buffer Size Too Large)";
        
        }
    }

    
    


    return gui;
}